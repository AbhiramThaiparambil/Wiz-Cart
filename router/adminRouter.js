const express = require("express");
const adminRoute = express();
const adminController = require("../controller/adminController");
const { upload } = require("../config/imageResizing");
const {isLogin,isLogout}=require('../auth/adminAuth')
const session =require('express-session')
const nocache = require("nocache");
// const productAddRoute  = require("../controller/productAdding");
adminRoute.use(nocache());



adminRoute.get("/admin",isLogout, adminController.adminLogin); 
adminRoute.post("/adminLoginData",isLogout,adminController.adminLogindata);

// HOME PAGE
adminRoute.get("/dashboard",isLogin, adminController.dashBord);

// USER MANAGEMENT
adminRoute.get("/userList",isLogin, adminController.userList);
adminRoute.post("/blockUser",isLogin, adminController.blockUser);

// PRODUCT MANAGEMENT
adminRoute.get("/Products",isLogin ,adminController.products);
adminRoute.get("/addProduct",isLogin, adminController.addProduct);
// adminRoute.post("/productAdded",upload.array("image", 3),adminController.productAdded);
adminRoute.post("/editProduct",isLogin, adminController.editProduct);
adminRoute.get("/editProductForm",isLogin, adminController.editProductForm);
adminRoute.post("/deleteImg",isLogin, adminController.deleteImg);
adminRoute.post("/HideProduct", adminController.hideProduct);
adminRoute.post("/UnhideProduct",isLogin, adminController.unHide);
adminRoute.post("/deleteProduct",isLogin, adminController.deleteProduct);

// CATEGORY MANAGEMENT
adminRoute.get("/category",isLogin, adminController.category);
adminRoute.post("/addCategory", adminController.addCategory);
adminRoute.post("/catDelete", adminController.deleteCategory);
adminRoute.post("/catHide", adminController.hideCategory);
adminRoute.post("/catShow", adminController.showCategory);
adminRoute.post("/editcategory",adminController.editCategory)
adminRoute.get('/logout',adminController.logout)


//orderMangement
adminRoute.get("/orderMangement",adminController.orderMangement)
adminRoute.post("/update-status",adminController.updateStatus)


// COUPON MANGEMENT 

adminRoute.get('/couponMangement',adminController.couponMangemnt)
adminRoute.post('/createCoupon',adminController.createCoupon)
adminRoute.delete('/delete-coupon',adminController.deleteCoupon)
adminRoute.patch('/show-coupon',adminController.unhideCoupon)
adminRoute.patch('/hide-coupon',adminController.hideCoupon)
adminRoute.post('/updateCoupon',adminController.updateCoupon)
module.exports = {
  adminRoute,
};
