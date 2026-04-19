import Appointment from "../models/Appointment.js";
import AppointmentService from "../models/AppointmentService.js";
import Slot from "../models/Slot.js";
import Vehicle from "../models/Vehicle.js";
import Service from "../models/Service.js";
import PriceLine from "../models/PriceLine.js";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";
import mongoose from "mongoose";

// ==================== ĐẶT LỊCH HẸN ====================

// Đặt lịch hẹn (online + tại quầy)
export const registerAppointment = async (req, res) => {
    const { slot_id, vehicle_id, service_ids, appointment_datetime } = req.body;

    if (!slot_id) {
        return res.status(400).json({ message: "Vui lòng chọn khung giờ" });
    }
    if (!service_ids || service_ids.length === 0) {
        return res.status(400).json({ message: "Vui lòng cung cấp thông tin dịch vụ" });
    }
    if (!appointment_datetime) {
        return res.status(400).json({ message: "Vui lòng cung cấp thời gian lịch hẹn" });
    }
    if (!vehicle_id) {
        return res.status(400).json({ message: "Vui lòng cung cấp thông tin xe" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Kiểm tra xe
        const vehicle = await Vehicle.findById(vehicle_id);
        if (!vehicle || vehicle.is_deleted) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Không tìm thấy xe" });
        }

        // Kiểm tra xe đã có lịch hẹn đang chờ chưa
        const existingAppointment = await Appointment.findOne({
            vehicle_id,
            status: { $in: ['waiting', 'in_progress'] },
            is_deleted: false,
        });
        if (existingAppointment) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({ message: "Xe đã có lịch hẹn đang chờ xử lý" });
        }

        // Kiểm tra slot
        const slot = await Slot.findById(slot_id);
        if (!slot || slot.is_deleted || slot.status !== "available") {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Slot không khả dụng" });
        }

        // Kiểm tra slot đã có lịch trong ngày chưa
        const startOfDay = new Date(appointment_datetime);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(appointment_datetime);
        endOfDay.setHours(23, 59, 59, 999);

        const slotTaken = await Appointment.findOne({
            slot_id,
            is_deleted: false,
            status: { $in: ['waiting', 'in_progress'] },
            appointment_datetime: { $gte: startOfDay, $lte: endOfDay }
        });
        if (slotTaken) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ 
                message: `Slot ${slot.start_time} đã có lịch hẹn trong ngày này` 
            });
        }

        // Book slot
        slot.status = "booked";
        await slot.save({ session });

        // Tạo lịch hẹn
        const appointment = new Appointment({
            customer_id: vehicle.customer_id,
            vehicle_id,
            slot_id,
            appointment_datetime,
            status: "waiting",
            is_deleted: false,
        });
        await appointment.save({ session });

        // Thêm dịch vụ + tính tổng thời gian
        let totalTime = 0;
        for (let service_id of service_ids) {
            const priceLine = await PriceLine.findOne({
                service_id,
                vehicle_type_id: vehicle.vehicle_type_id,
                is_active: true,
                is_deleted: false,
            });
            if (!priceLine) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ 
                    message: `Không tìm thấy giá cho dịch vụ ${service_id}` 
                });
            }

            const service = await Service.findById(service_id);
            if (service) totalTime += service.time_required;

            const appointmentService = new AppointmentService({
                appointment_id: appointment._id,
                price_line_id: priceLine._id,
                is_deleted: false,
            });
            await appointmentService.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ 
            message: "Đăng ký lịch hẹn thành công", 
            appointment,
            slot: {
                _id: slot._id,
                start_time: slot.start_time,
                status: slot.status,
            },
            total_time: totalTime,
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Lỗi khi đăng ký lịch hẹn:", err.message);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
};

// ==================== XỬ LÝ LỊCH HẸN ====================

// Khách đến - xe vào gara
export const processAppointmentArrival = async (req, res) => {
    const { appointmentId } = req.params;

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.is_deleted) {
            return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
        }
        if (appointment.status !== 'waiting') {
            return res.status(400).json({ message: "Lịch hẹn không ở trạng thái chờ" });
        }

        appointment.status = 'in_progress';
        await appointment.save();

        res.json({ 
            message: "Xe đã vào gara, đang thực hiện dịch vụ", 
            appointment 
        });
    } catch (err) {
        console.error("Lỗi khi xử lý khách hàng đến:", err.message);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
};

// Cập nhật trạng thái từng dịch vụ
export const updateServiceStatus = async (req, res) => {
    const { appointmentServiceId } = req.params;

    try {
        const appointmentService = await AppointmentService.findById(appointmentServiceId);
        if (!appointmentService || appointmentService.is_deleted) {
            return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
        }

        appointmentService.is_done = !appointmentService.is_done;
        appointmentService.time_completed = appointmentService.is_done ? Date.now() : null;
        await appointmentService.save();

        res.json({ 
            message: "Cập nhật trạng thái dịch vụ thành công", 
            appointmentService 
        });
    } catch (err) {
        console.error("Lỗi khi cập nhật trạng thái dịch vụ:", err.message);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
};

// Hoàn thành lịch hẹn - slot available lại
export const completeAppointment = async (req, res) => {
    const { appointmentId } = req.params;

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.is_deleted) {
            return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
        }
        if (appointment.status !== 'in_progress') {
            return res.status(400).json({ message: "Lịch hẹn chưa được xử lý" });
        }

        // Kiểm tra tất cả dịch vụ đã xong chưa
        const services = await AppointmentService.find({
            appointment_id: appointmentId,
            is_deleted: false,
        });

        const allDone = services.every(s => s.is_done === true);
        if (!allDone) {
            return res.status(400).json({
                message: "Vẫn còn dịch vụ chưa hoàn thành",
                services: services.map(s => ({
                    id: s._id,
                    is_done: s.is_done,
                }))
            });
        }

        // Completed + slot available lại
        appointment.status = 'completed';
        await appointment.save();

        const slot = await Slot.findById(appointment.slot_id);
        if (slot) {
            slot.status = 'available';
            await slot.save();
        }

        res.json({ 
            message: "Hoàn thành tất cả dịch vụ, slot đã sẵn sàng", 
            appointment, 
            slot 
        });
    } catch (err) {
        console.error("Lỗi khi hoàn thành lịch hẹn:", err.message);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
};

// Hủy lịch hẹn
export const cancelAppointment = async (req, res) => {
    const { appointmentId } = req.params;

    try {
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment || appointment.is_deleted) {
            return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
        }

        const invoice = await Invoice.findOne({
            appointment_id: appointmentId,
            is_deleted: false,
        }).lean();
        if (invoice && invoice.status === "paid") {
            return res.status(400).json({ message: "Lịch hẹn đã thanh toán, không thể hủy" });
        }

        if (appointment.status === "completed" || appointment.status === "cancelled") {
            return res.status(400).json({ message: "Không thể hủy lịch hẹn này" });
        }

        appointment.status = "cancelled";
        appointment.is_deleted = true;
        await appointment.save();

        // Slot available lại
        const slot = await Slot.findById(appointment.slot_id);
        if (slot) {
            slot.status = "available";
            await slot.save();
        }

        res.json({ message: "Lịch hẹn đã được hủy", appointment });
    } catch (err) {
        console.error("Lỗi khi hủy lịch hẹn:", err.message);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
};

// ==================== LẤY THÔNG TIN LỊCH HẸN ====================

// Lấy chi tiết 1 lịch hẹn
export const getAppointmentDetails = async (req, res) => {
    const { appointmentId } = req.params;

    try {
        const appointment = await Appointment.findOne({
            _id: appointmentId,
            is_deleted: false,
        })
            .populate("vehicle_id customer_id")
            .populate("slot_id")
            .lean();

        if (!appointment) {
            return res.status(404).json({ message: "Không tìm thấy lịch hẹn" });
        }

        const appointmentServices = await AppointmentService.find({
            appointment_id: appointmentId,
            is_deleted: false,
        })
            .populate({
                path: "price_line_id",
                populate: { path: "service_id", model: "Service" },
            })
            .lean();

        let totalCost = 0;
        let totalTime = 0;
        const services = appointmentServices.map(appService => {
            totalCost += appService.price_line_id.price;
            totalTime += appService.price_line_id.service_id.time_required;
            return {
                _id: appService.price_line_id.service_id._id,
                appServiceId: appService._id,
                name: appService.price_line_id.service_id.name,
                description: appService.price_line_id.service_id.description,
                price: appService.price_line_id.price,
                time_required: appService.price_line_id.service_id.time_required,
                is_done: appService.is_done,
                time_completed: appService.time_completed,
            };
        });

        const invoice = await Invoice.findOne({
            appointment_id: appointmentId,
            is_deleted: false,
        }).lean();

        res.json({ 
            ...appointment, 
            services, 
            total_cost: totalCost,
            total_time: totalTime,
            invoice: invoice || null,
        });
    } catch (err) {
        console.error("Lỗi khi lấy thông tin lịch hẹn:", err.message);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
};

// Tìm kiếm lịch hẹn (admin)
export const searchAppointments = async (req, res) => {
    const { date, status, license_plate, customer_name, phone_number } = req.query;

    try {
        let appointmentQuery = { is_deleted: false };

        // Lọc theo ngày
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            appointmentQuery.appointment_datetime = { 
                $gte: startOfDay, 
                $lte: endOfDay 
            };
        }

        // Lọc theo status
        if (status) appointmentQuery.status = status;

        // Tìm theo biển số xe
        if (license_plate) {
            const vehicle = await Vehicle.findOne({
                license_plate: { $regex: license_plate, $options: 'i' },
                is_deleted: false,
            });
            if (!vehicle) return res.json([]);
            appointmentQuery.vehicle_id = vehicle._id;
        }

        // Tìm theo tên khách hoặc SĐT
        if (customer_name || phone_number) {
            let customerQuery = { is_deleted: false };
            if (customer_name) customerQuery.name = { $regex: customer_name, $options: 'i' };
            if (phone_number) customerQuery.phone_number = { $regex: phone_number, $options: 'i' };

            const customers = await Customer.find(customerQuery);
            if (customers.length === 0) return res.json([]);
            appointmentQuery.customer_id = { $in: customers.map(c => c._id) };
        }

        const appointments = await Appointment.find(appointmentQuery)
            .populate("customer_id")
            .populate("vehicle_id")
            .populate("slot_id")
            .sort({ appointment_datetime: -1 })
            .lean();

        if (appointments.length === 0) return res.json([]);

        // Lấy invoice map
        const appointmentIds = appointments.map(a => a._id);
        const invoices = await Invoice.find({
            appointment_id: { $in: appointmentIds },
            is_deleted: false,
        }).lean();

        const invoiceMap = {};
        invoices.forEach(invoice => {
            invoiceMap[invoice.appointment_id.toString()] = invoice;
        });

        // Lấy services cho từng lịch hẹn
        const result = await Promise.all(
            appointments.map(async (appointment) => {
                const appointmentServices = await AppointmentService.find({
                    appointment_id: appointment._id,
                    is_deleted: false,
                })
                    .populate({
                        path: "price_line_id",
                        populate: { path: "service_id", model: "Service" },
                    })
                    .lean();

                let totalCost = 0;
                let totalTime = 0;
                const services = appointmentServices.map(appService => {
                    totalCost += appService.price_line_id.price;
                    totalTime += appService.price_line_id.service_id.time_required;
                    return {
                        _id: appService.price_line_id.service_id._id,
                        appServiceId: appService._id,
                        name: appService.price_line_id.service_id.name,
                        price: appService.price_line_id.price,
                        time_required: appService.price_line_id.service_id.time_required,
                        is_done: appService.is_done,
                        time_completed: appService.time_completed,
                    };
                });

                return {
                    ...appointment,
                    services,
                    total_cost: totalCost,
                    total_time: totalTime,
                    invoice: invoiceMap[appointment._id.toString()] || null,
                };
            })
        );

        res.json(result);
    } catch (err) {
        console.error("Lỗi khi tìm lịch hẹn:", err.message);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
};

// Lấy lịch hẹn của khách hàng (mobile)
export const getAppointmentsByCustomer = async (req, res) => {
    const { customerId } = req.params;

    try {
        const appointments = await Appointment.find({
            customer_id: customerId,
            is_deleted: false,
        })
            .populate("vehicle_id slot_id")
            .sort({ appointment_datetime: -1 })
            .lean();

        if (appointments.length === 0) return res.json([]);

        const appointmentIds = appointments.map(a => a._id);
        const invoices = await Invoice.find({
            appointment_id: { $in: appointmentIds },
            is_deleted: false,
        }).lean();

        const invoiceMap = {};
        invoices.forEach(invoice => {
            invoiceMap[invoice.appointment_id.toString()] = invoice;
        });

        const result = await Promise.all(
            appointments.map(async (appointment) => {
                const appointmentServices = await AppointmentService.find({
                    appointment_id: appointment._id,
                    is_deleted: false,
                })
                    .populate({
                        path: "price_line_id",
                        populate: { path: "service_id", model: "Service" },
                    })
                    .lean();

                let totalCost = 0;
                let totalTime = 0;
                const services = appointmentServices.map(appService => {
                    totalCost += appService.price_line_id.price;
                    totalTime += appService.price_line_id.service_id.time_required;
                    return {
                        _id: appService.price_line_id.service_id._id,
                        name: appService.price_line_id.service_id.name,
                        price: appService.price_line_id.price,
                        time_required: appService.price_line_id.service_id.time_required,
                        is_done: appService.is_done,
                        time_completed: appService.time_completed,
                    };
                });

                return {
                    ...appointment,
                    services,
                    total_cost: totalCost,
                    total_time: totalTime,
                    invoice: invoiceMap[appointment._id.toString()] || null,
                };
            })
        );

        res.json(result);
    } catch (err) {
        console.error("Lỗi khi lấy lịch hẹn của khách hàng:", err.message);
        res.status(500).json({ message: "Lỗi máy chủ" });
    }
};
