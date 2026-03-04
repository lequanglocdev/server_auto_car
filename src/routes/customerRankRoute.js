import express from 'express'
import isAdmin from '../middlewares/checkAdmin.js'
import { addCustomerRank, deleteCustomerRank, getAllCustomerRank, getCustomerRankById, updateCustomerRank } from '../controllers/customerRankController.js'
const router = express.Router()

router.get("/",[isAdmin],getAllCustomerRank)
router.get('/:rankId',[isAdmin],getCustomerRankById)
router.post('/',[isAdmin],addCustomerRank)
router.put('/:rankId',[isAdmin],updateCustomerRank)
router.delete('/:rankId',[isAdmin],deleteCustomerRank)

export default router
