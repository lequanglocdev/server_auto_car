import Service from '../models/Service.js';
import PriceLine from '../models/PriceLine.js';
import PriceHeader from '../models/PriceHeader.js';

export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find({ is_deleted: false })  
    res.json(services);
  }
  catch (error) {
    console.error('Lỗi khi lấy danh sách Service:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}

export const addService  = async (req, res) => {
  try {
    const  { service_code, name, description, time_required } = req.body;
    const newService = new Service({
      service_code,
      name,
      description,
      time_required,
    });
    await newService.save();
    res.status(201).json(newService);
  } catch (error) {
    console.error('Lỗi khi thêm Service:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}

export const updateService = async (req, res) => {
  try {
    const { service_code, name, description, time_required } = req.body;
    const {serviceId} = req.params;
    const priceLines = await PriceLine.find({ service_id: serviceId,is_deleted: false });
    if(priceLines.length > 0){
      return  res.status(400).json({ message: 'Không thể cập nhật dịch vụ vì có các dòng giá liên quan.' });
    }
    let service = await Service.findById(serviceId);
    if(!service || service.is_deleted){
      return  res.status(404).json({message: 'Không tìm thấy dịch vụ'});
    }
    // Cập nhật thông tin dịch vụ
    if (service_code) service.service_code = service_code;
    if (name) service.name = name;
    if (description) service.description = description;
    if (time_required) service.time_required = time_required;

    service.updated_at = Date.now();

    await service.save();
    res.json({message: 'Cập nhật dịch vụ thành công'});
  } catch (error) {
    console.error('Lỗi khi cập nhật Service:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}

export const deleteService = async (req, res) => {
  try {
    const {serviceId} = req.params;
    const priceLines = await PriceLine.find({ service_id: serviceId,is_deleted: false });
    if(priceLines.length > 0){
      return  res.status(400).json({ message: 'Không thể xóa dịch vụ vì có các dòng giá liên quan.' });
    }
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
    }    
    let priceHeaders = await PriceHeader.findOne({ service_id: serviceId, is_deleted: false,is_active: true });
    if (priceHeaders) {
      return res.status(400).json({ message: 'Dịch vụ này đang được sử dụng trong bảng giá: ' + priceHeaders.price_list_name });
    } 
    service.is_deleted = true;
    service.updated_at = Date.now();
    await service.save();
    res.json({message: 'Xóa dịch vụ thành công'});
  }
  catch (error) {   
    console.error('Lỗi khi xóa Service:', error.message);
    res.status(500).send('Lỗi máy chủ');
  }
}

export const getServiceById = async (req, res) => {
try {
  const {serviceId} = req.params;
  const service = await Service.findOne({ _id: serviceId, is_deleted: false });
  if (!service || service.is_deleted) {
    return res.status(404).json({ message: 'Không tìm thấy dịch vụ' });
  }
  res.json(service);
} catch (error) {
  console.error('Lỗi khi lấy thông tin dịch vụ:', error.message);
  res.status(500).send('Lỗi máy chủ');
}

}
