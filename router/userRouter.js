const express = require("express");
const userRoute = express();
const path = require("path");
const passport = require("passport");
const userController = require("../controller/userController");
const { isLogin, isLogout } = require("../auth/userAuth");
const nocache = require("nocache");
const { log } = require("console");
const { db, updateSearchIndex } = require("../model/userModer");
require("../auth/google");

userRoute.use(nocache());
 userRoute.get('/',(req,res)=>{
  res.redirect('/wizcart')
 })

userRoute.get("/login", isLogout, userController.login);
userRoute.post("/loginData", isLogout, userController.loginData);

userRoute.get("/singup", isLogout, userController.signup);
userRoute.post("/signupData", isLogout, userController.signupData);

userRoute.get("/user-block",userController.userBlocked)

userRoute.get("/signupOtp", isLogout, userController.otpSending);
userRoute.post("/otpData", isLogout, userController.otpData);

userRoute.get("/wizcart", isLogout, userController.home);

userRoute.get("/home", isLogin, userController.homeLogin);
userRoute.get("/shopmore", userController.shopmore);
// userRoute.get("/ShopMoree", userController.ShopMoree);

userRoute.get("/logout", userController.logout);

userRoute.get("/singleProduct:id", userController.singleProduct);

userRoute.get("/profile", userController.profile);

userRoute.post("/updatename", userController.ProfileNameUpdate);

userRoute.post("/updateemail", userController.ProfileUpdateEmail);

userRoute.post("/otpemailupdate", userController.profileOtpsumbit);

userRoute.post("/ProfilUpdatePass", userController.profilenewPass);

userRoute.get("/forgetpassword", userController.forgotPassword);
userRoute.post("/forgotEmail", userController.forgotEmail);
userRoute.post("resetPassword", userController.forgetRestpassword);
userRoute.post("/loadforgetpass", userController.loadforgetpassword);

userRoute.get("/manageaddress", userController.manageaddress);

userRoute.post("/newaddress", userController.newaddress);

userRoute.post("/editAddress", userController.editAddress);

userRoute.get("/addressdelete/:id", userController.addressDelete);
userRoute.get("/addTocart", userController.addTocart);

userRoute.get("/cart", userController.cart);



userRoute.get("/checkOut", userController.checkOut);

userRoute.post("/confirmOrder", userController.createOrder);

userRoute.get("/orderSuccess", userController.orderSuccess);

userRoute.post("/ordercancellation", userController.cancellProductStatus);
userRoute.get("/getOrderHistory", userController.getOrderHistory);
userRoute.put("/quantityUpdate", userController.quantityUpdate);
userRoute.delete("/removeItem/id:id", userController.removeItem);

module.exports = {
  userRoute,
};
