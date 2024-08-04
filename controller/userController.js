const { log, error, Console } = require("console");
const User = require("../model/userModer");
const Product = require("../model/productModel");
const Cart = require("../model/cartModel");
const nodemailer = require("nodemailer");
const Mailgen = require("mailgen");
const bcrypt = require("bcryptjs");
const { render } = require("ejs");
const { set } = require("mongoose");
const mongoose = require("mongoose");
const Order = require("../model/orders.model");
const Category = require("../model/categoryModel");
require("dotenv").config();
// const { privateDecrypt } = require("crypto");
// const session=require('express-session')

const homeLogin = async (req, res) => {
  try {
    const products = await Product.find({}).limit(8);
    const toast = req.flash("info");
    if (products) {
      if (req.session.user_id) {
        const user = await User.findById(req.session.user_id);

        if (user) {
          const cartQuantityResult = await Cart.aggregate([
            {
              $match: {
                user_id: new mongoose.Types.ObjectId(req.session.user_id),
              },
            },
            { $unwind: "$Product" },
            { $group: { _id: null, productCount: { $sum: 1 } } },
          ]);

          const cartQuantity =
            cartQuantityResult.length > 0
              ? cartQuantityResult[0].productCount
              : 0;

          console.log("This is the new cart quantity: " + cartQuantity);

          res.render("user/home", {
            products: products,
            user: user,
            toast,
            cartQuantity,
          });
        } else {
          res.redirect("/login");
        }
      } else {
        res.render("user/home", { products: products, toast });
      }
    } else {
      res.status(404).render("404");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).render("error", { message: "Server Error" });
  }
};

const home = async (req, res) => {
  try {
    const products = await Product.find({}).limit(8);

    if (products) {
      if (req.session.user_id) {
        const user = await User.findById(req.session.user_id);

        if (user) {
          const toast = ["LOGIN SUCCESSFULLY ✅"];
          res.render("user/home", { products: products, user: user, toast });
        } else {
          res.redirect("/login");
        }
      } else {
        let toast = req.flash("info");
        if (toast.length === 0) {
          console.log("No toast messages");
          toast = [];
          res.render("user/home", { products: products, toast });
        }
      }
    } else {
      res.status(404).render("404");
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).render("error", { message: "Server Error" });
  }
};

const shopmore = async (req, res) => {
  try {
    const pageNum = parseInt(req.query.page, 10) || 1;
    const perpage = 6;

    const searchQuery = req.query.search ? req.query.search.trim() : "";
    const minPrice = req.query.minPrice
      ? parseFloat(req.query.minPrice)
      : undefined;
    const maxPrice = req.query.maxPrice
      ? parseFloat(req.query.maxPrice)
      : undefined;
    const queryBrand = req.query.brand ? req.query.brand.trim() : "";
    const queryCategory = req.query.category ? req.query.category.trim() : "";
    const sortOption = req.query.sort || "";

    let query = {};

    if (searchQuery) {
      query.product_name = new RegExp(searchQuery, "i");
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = minPrice;
      if (maxPrice !== undefined) query.price.$lte = maxPrice;
    }

    if (queryBrand) {
      query.brands = queryBrand;
    }

    if (queryCategory) {
      query.category_name = queryCategory;
    }

    const productCount = await Product.countDocuments(query);
    const totalPages = Math.ceil(productCount / perpage);

    let sort = {};
    switch (sortOption) {
      case "newArrivals":
        sort = { createdAt: -1 }; // Newest first
        break;
      case "lowtohigh":
        sort = { price: 1 };
        break;
      case "hightolow":
        sort = { price: -1 };
        break;
      case "atoz":
        sort = { product_name: 1 };
        break;
      case "ztoa":
        sort = { product_name: -1 };
        break;
      default:
        sort = { _id: -1 }; // Default sorting
    }

    const products = await Product.find(query)
      .sort(sort)
      .skip((pageNum - 1) * perpage)
      .limit(perpage);

    const category = await Category.find({ Hide_category: 0 });

    const brandsResult = await Product.aggregate([
      { $unwind: "$brands" },
      { $group: { _id: "$brands" } },
      { $project: { _id: 0, brand: "$_id" } },
    ]);

    const brands = brandsResult.map((item) => item.brand);
    let user = null;
    let cartQuantity = 0;

    if (req.session.user_id) {
      user = await User.findOne({ _id: req.session.user_id });

      const cartQuantityResult = await Cart.aggregate([
        {
          $match: { user_id: new mongoose.Types.ObjectId(req.session.user_id) },
        },
        { $unwind: "$Product" },
        { $group: { _id: null, productCount: { $sum: 1 } } },
      ]);

      if (cartQuantityResult && cartQuantityResult.length > 0) {
        cartQuantity = cartQuantityResult[0].productCount;
      }
    }

    res.render("user/shopmore", {
      products,
      category,
      brands,
      searchQuery,
      minPrice,
      maxPrice,
      queryBrand,
      queryCategory,
      sortOption,
      pageNum,
      totalPages,
      user: user,
      cartQuantity,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server Error");
  }
};

// LOGIN //GET
const login = async (req, res) => {
  try {
    const toast = req.flash("info");
    res.render("user/login", { toast });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// LOGIN //POST
const loginData = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const userValid = await User.findOne({ email: email });

    if (!userValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Check if user is banned
    if (userValid.is_ban === 1) {
      return res
        .status(200)
        .json({ redirectUrl: "user-block", message: "Login successful!" });
    }

    // Check if user has a Google account
    if (userValid.googleId > 0) {
      return res
        .status(200)
        .json({ redirectUrl: "/signup/google", message: "Login successful!" });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, userValid.password);
    if (isMatch) {
      // Set user session
      req.session.user_id = userValid._id;
      console.log(req.session.user_id);
      req.flash("info", "✅ login successful");
      return res
        .status(200)
        .json({ redirectUrl: "/home", message: "Login successful!" });
    } else {
      return res.status(401).json({ message: "Invalid email or password." });
    }
  } catch (err) {
    console.error(err.message);
    res
      .status(500)
      .render("user/login", { message: "Server Error", toast: [] });
  }
};

//block User
const userBlocked = (req, res) => {
  res.render("user/ban");
};

// SIGNUP //GET

const signup = async (req, res) => {
  try {
    const toast = [];
    res.render("user/signUp", { toast });
  } catch (err) {
    console.error(err.message);
  }
};

let otpEmail; //email for otp verification
let otpVerification;
let password;
let email;
let name;

// SIGNUP //POST

const signupData = async (req, res) => {
  try {
    const unique = await User.findOne({ email: req.body.email });

    if (unique) {
      res.render("user/signup", { message: "email is already exists" });
      return;
    }
    name = req.body.name;
    email = req.body.email;
    otpEmail = email;

    console.log(`Email: ${email}`); // Log email for debugging

    if (email && req.body.password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
      password = hashedPassword;

      console.log(`Hashed Password: ${hashedPassword}`);

      res.redirect("/signupOtp");
    } else {
      console.error("Email or password not provided.");
      res.render("user/signUp");
    }
  } catch (err) {
    console.error(err.message);
  }
};

// OTP SENDING
const otpSending = (req, res) => {
  try {
    if (otpEmail) {
      const sendOtp = () => {
        // OTP sending code function
        const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
        let otp = generateOTP();
        otpVerification = otp;
        console.log(`Generated OTP: ${otp}`);
        console.log(`Sending OTP to: ${otpEmail}`); // Log email before sending

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.email,
            pass: process.env.App_password,
          },
        });

        const mailGenerator = new Mailgen({
          theme: "default",
          product: {
            name: "WIZCART",
            link: "http://mailgen.js/",
          },
        });

        const emailContent = {
          body: {
            name: otpEmail,
            intro: "OTP verification",
            table: {
              data: [
                {
                  otp: otp,
                },
              ],
            },
            outro: "Welcome to Wizcart!",
          },
        };

        const mail = mailGenerator.generate(emailContent);

        const message = {
          from: process.env.email,
          to: otpEmail,
          subject: "OTP verification",
          html: mail,
        };

        transporter
          .sendMail(message)
          .then(() => {
            const toast = [`OTP has been sent to ${otpEmail} ✅`];
            res.render("user/otpSignup", { toast });
            console.log("Successfully sent message.");
            const startTime = Date.now();
            const duration = 65 * 1000;

            console.log(
              `Timer started at: ${new Date(startTime).toLocaleTimeString()}`
            );

            setTimeout(() => {
              const currentTime = Date.now();
              console.log(
                `otp send in mail ${new Date(currentTime).toLocaleTimeString()}`
              );
              console.log(
                `OTP expire in : ${(currentTime - startTime) / 1000} seconds`
              );
              otpVerification = -1;
            }, duration);
          })
          .catch((err) => {
            console.error(err.message);
          });
      };

      sendOtp();
    } else {
      res.render("404");
    }
  } catch (error) {
    console.log(error.message);
  }
};

// OTP POST
const otpData = async (req, res) => {
  try {
    let otpArr = req.body.otp;
    inputOtp = parseInt(otpArr.join(""));

    console.log(inputOtp);

    if (otpVerification !== inputOtp) {
      const toast = ["𝙿𝙻𝙴𝙰𝚂𝙴 𝙴𝙽𝚃𝙴𝚁 𝙰 𝚅𝙰𝙻𝙸𝙳 𝙾𝚃𝙿"];

      res.render("user/otpSignup", {
        message: "𝙿𝙻𝙴𝙰𝚂𝙴 𝙴𝙽𝚃𝙴𝚁 𝙰 𝚅𝙰𝙻𝙸𝙳 𝙾𝚃𝙿",
        toast,
      });
      return;
    }

    if (otpVerification === inputOtp) {
      otpVerification = null;
      otpEmail = null;

      const signdata = new User({
        name: name,
        email: email,
        password: password,
        is_admin: 0,
        is_ban: 0,
        googleId: 0,
        address: [],
      });

      const singupdataSucess = await signdata.save();
      if (singupdataSucess) {
        req.flash("info", "𝚜𝚒𝚐𝚗 𝚞𝚙 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢");

        res.redirect("/login");
      }
    } else {
      console.error("OTP does not match.");
      // Handle invalid OTP
    }
  } catch (error) {
    console.log(error.message);
  }
};

const singleProduct = async (req, res) => {
  try {
    const singleId = req.params.id;
    console.log(singleId);
    const singleProduct = await Product.findOne({ _id: singleId });
    console.log(singleProduct.product_name);

    const cartExist = await Cart.findOne({
      user_id: req.session.user_id,
      "Product.productId": singleId,
    });

    let isCartexist;
    if (cartExist) {
      isCartexist = 1;
    }

    console.log(isCartexist);

    res.render("user/singleProduct", {
      singleProduct: singleProduct,
      isCartexist,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const logout = async (req, res) => {
  try {
    console.log(req.session.user_id); // Log the session ID for debugging
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session during logout:", err.message);
        return res.status(500).send("An error occurred while logging out.");
      }
      res.redirect("/wizcart");
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

const profile = async (req, res) => {
  try {
    if (req.session.user_id) {
      const userDetails = await User.findById(req.session.user_id);
      res.render("user/Profile", { user: userDetails, toast: [] });
    } else {
      req.flash("info", " 🚨 LOGIN FIRST ");
      res.redirect("/wizcart");
    }
  } catch (error) {}
};

const ProfileNameUpdate = async (req, res) => {
  try {
    const newName = req.body.updateName;

    const updateStatus = await User.updateOne(
      { _id: req.session.user_id },
      { $set: { name: newName } }
    );

    if (updateStatus) {
      res.json({ message: "Form data received successfully", name: name });
      console.log("hello");
    } else {
      res.json({ success: false, message: "No changes made" });
    }
  } catch (error) {}
};

let newOtp;
let newEmail;
const ProfileUpdateEmail = async (req, res) => {
  try {
    newEmail = req.body.updateEmail;

    const sendOtp = () => {
      // OTP sending code function
      const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
      newOtp = generateOTP();

      otpVerification = newOtp;
      console.log(`Generated OTP: ${newOtp}`);
      console.log(`Sending OTP to: ${newEmail}`); // Log email before sending

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.email,
          pass: process.env.App_password,
        },
      });

      const mailGenerator = new Mailgen({
        theme: "default",
        product: {
          name: "WIZCART",
          link: "http://mailgen.js/",
        },
      });

      const emailContent = {
        body: {
          name: otpEmail,
          intro: " OTP verification for Update email ",
          table: {
            data: [
              {
                otp: newOtp,
              },
            ],
          },
          outro: "Welcome to Wizcart!",
        },
      };

      const mail = mailGenerator.generate(emailContent);

      const message = {
        from: process.env.email,
        to: newEmail,
        subject: "OTP verification",
        html: mail,
      };

      transporter
        .sendMail(message)
        .then(() => {
          const startTime = Date.now();
          const duration = 130 * 1000;

          console.log(
            `Timer started at: ${new Date(startTime).toLocaleTimeString()}`
          );

          res.json({
            message: "Form data received successfully",
            newEmail: newEmail,
          });

          setTimeout(() => {
            const currentTime = Date.now();
            console.log(
              `otp send in mail ${new Date(currentTime).toLocaleTimeString()}`
            );
            console.log(
              `OTP expire in : ${(currentTime - startTime) / 1000} seconds`
            );
            otpVerification = -1;
          }, duration);
        })
        .catch((err) => {
          console.error(err.message);
        });
    };

    sendOtp();
  } catch (error) {}
};

const profileOtpsumbit = async (req, res) => {
  try {
    const enterdOtp = req.body.OTP;

    if (newOtp == enterdOtp) {
      console.log(req.session.user_id);
      const updateStatus = await User.updateOne(
        { _id: req.session.user_id },
        { $set: { email: newEmail } }
      );

      if (updateStatus) {
        console.log("Email updated successfully");
        res.json({ success: true, message: "Email updated successfully" });
      }
    } else {
      console.log("OTP does not match");
      res.json({ success: false, message: "OTP does not match" });
    }
  } catch (error) {}
};

const profilenewPass = async (req, res) => {
  try {
    const { currentPass, newPass } = req.body;

    const userData = await User.findById({ _id: req.session.user_id });
    console.log(userData);

    if (!userData.password) {
      console.error(`User (${userData._id}) does not have a password`);
      return res.status(400).json({
        error: "User does not have a password you signUp with google",
      });
    }

    const isMatch = await bcrypt.compare(currentPass, userData.password);

    if (isMatch) {
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPass, saltRounds);
      hashedNewPassword;
      const isPasswordChanged = await User.updateOne(
        { _id: req.session.user_id },
        { $set: { password: hashedNewPassword } }
      );
      if (isPasswordChanged) {
        console.log("passwordChanged");
        return res
          .status(200)
          .json({ message: "Password updated successfully" });
      }
    } else {
      return res.status(401).json({ error: "Current password does not match" });
    }
  } catch (error) {}
};

// forgotpassword renderpage

const forgotPassword = async (req, res) => {
  try {
    res.render("user/ForgotPassword");
  } catch (error) {
    console.log(error.message);
  }
};

let forgetpasswordEmail;
let ForgetOtp;

const forgotEmail = async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`Received email: ${email}`);

    const accountExist = await User.findOne({ email: email });
    console.log(`Account found: ${accountExist}`);

    if (accountExist) {
      forgetpasswordEmail = email;

      const sendOtp = () => {
        // OTP sending code function
        const generateOTP = () => Math.floor(100000 + Math.random() * 900000);
        let otp = generateOTP();
        ForgetOtp = otp; // Store OTP for next route use
        console.log(`Generated OTP: ${otp}`);
        console.log(`Sending OTP to: ${forgetpasswordEmail}`); // Log email before sending

        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL,
            pass: process.env.APP_PASSWORD,
          },
        });

        const mailGenerator = new Mailgen({
          theme: "default",
          product: {
            name: "WIZCART",
            link: "http://mailgen.js/",
          },
        });

        const emailContent = {
          body: {
            name: forgetpasswordEmail,
            intro: "OTP verification",
            table: {
              data: [
                {
                  otp: otp,
                },
              ],
            },
            outro: "Welcome to Wizcart!",
          },
        };

        const mail = mailGenerator.generate(emailContent);

        const message = {
          from: process.env.EMAIL,
          to: forgetpasswordEmail, // Corrected here to use forgetpasswordEmail
          subject: "OTP verification",
          html: mail,
        };

        transporter
          .sendMail(message)
          .then(() => {
            const toast = [`OTP has been sent to ${forgetpasswordEmail} ✅`];
            res.status(200).json({
              success: true,
              message: `OTP has been sent to ${forgetpasswordEmail}`,
              otp: otp,
            });
            console.log("Successfully sent message.");
            const startTime = Date.now();
            const duration = 65 * 1000;

            console.log(
              `Timer started at: ${new Date(startTime).toLocaleTimeString()}`
            );

            setTimeout(() => {
              const currentTime = Date.now();
              console.log(
                `OTP sent in mail at ${new Date(
                  currentTime
                ).toLocaleTimeString()}`
              );
              console.log(
                `OTP expired in : ${(currentTime - startTime) / 1000} seconds`
              );
              ForgetOtp = -1;
            }, duration);
          })
          .catch((err) => {
            console.error(err.message);
            res.status(500).json({
              success: false,
              message: "Failed to send OTP email",
            });
          });
      };

      sendOtp();
    } else {
      console.log("Email not registered");
      res.status(400).json({
        success: false,
        message: "Email not registered, please sign up",
      });
    }
  } catch (error) {
    console.error(`Error in forgotEmail function: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "An error occurred",
    });
  }
};









const forgetRestpassword = async (req, res) => {
  try {
  } catch (error) {}
};

const loadforgetpassword = async (req, res) => {
  try {
    const { ForgotOtp, newPassword } = req.body;
  
     
    console.log(ForgetOtp);
    console.log(forgetpasswordEmail);

    if (ForgotOtp == ForgetOtp) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      const userData = await User.updateOne(
        { email: forgetpasswordEmail },
        { $set: { password: hashedPassword } }
      );
      if (userData) {
        req.flash("info", "✅ Password Updated");
        res.redirect("/login");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const manageaddress = async (req, res) => {
  try {
    const data = await User.findById({ _id: req.session.user_id });
    console.log();
    let toast = [];
    res.render("user/manageAddress", { user: data, toast });
  } catch (error) {}
};

const newaddress = async (req, res) => {
  try {
    const {
      name,
      mobile,
      pincode,
      locality,
      address,
      city,
      state,
      landmark,
      altmobile,
      addresstype,
    } = req.body;

    const newaddress = {
      name,
      mobile,
      pincode,
      locality,
      address,
      city,
      state,
      landmark,
      altmobile,
      addresstype,
      is_active: 0,
    };

    res.status(200).json({ message: "Address successfully added!" });
    console.log("Received address:", newaddress);

    console.log(req.session.user_id);
    const updateNewAddress = await User.updateOne(
      { _id: req.session.user_id },
      { $push: { address: newaddress } }
    );

    if (updateNewAddress) {
      return res.redirect("/manageaddress");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const editAddress = async (req, res) => {
  try {
    const {
      addressIndex,
      editName,
      editMobile,
      editPincode,
      editLocality,
      editAddress,
      editCity,
      editState,
      editLandmark,
      editAltmobile,
      editAddresstype,
    } = req.body;

    const updateData = {
      name: editName,
      mobile: editMobile,
      pincode: editPincode,
      locality: editLocality,
      address: editAddress,
      city: editCity,
      state: editState,
      landmark: editLandmark,
      altmobile: editAltmobile,
      addresstype: editAddresstype,
    };

    const editStatus = await User.updateOne(
      { _id: req.session.user_id },
      { $set: { [`address.${addressIndex}`]: updateData } }
    );

    if (editStatus) {
      res.redirect("/manageaddress");
    }
    console.log(editStatus);
  } catch (error) {}
};

const addressDelete = async (req, res) => {
  try {
    const addressIndex = req.params.id;

    console.log(addressIndex);

    const user = await User.findById(req.session.user_id);

    if (addressIndex < 0 || addressIndex >= user.address.length) {
      return res.status(400).send({ error: "Invalid address index" });
    }

    user.address.splice(addressIndex, 1);
    const deleteStatus = await user.save();

    if (deleteStatus) {
      return res.redirect("/manageaddress");
    } else {
      return res.status(500).send({ error: "Failed to delete address" });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ error: "An error occurred while deleting the address" });
  }
};

const addTocart = async (req, res) => {
  try {
    if (!req.session.user_id) {
      return res.redirect("/login");
    }

    const { productId, quantity } = req.query;
    const product = {
      productId: new mongoose.Types.ObjectId(productId),
      quantity: parseInt(quantity),
    };

    console.log(product);

    const result = await Cart.findOneAndUpdate(
      { user_id: new mongoose.Types.ObjectId(req.session.user_id) },
      {
        $set: {
          user_id: new mongoose.Types.ObjectId(req.session.user_id),
        },
        $addToSet: {
          Product: {
            productId: product.productId,
            quantity: 0,
          },
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    const productInCart = result.Product.find((p) =>
      p.productId.equals(product.productId)
    );

    if (productInCart) {
      await Cart.updateOne(
        {
          user_id: new mongoose.Types.ObjectId(req.session.user_id),
          "Product.productId": product.productId,
        },
        {
          $set: { "Product.$.quantity": product.quantity },
        }
      );
      // res.redirect(`/singleProduct:${productId}`)
      return res.status(200);
    } else {
      return res.status(200);
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).send("An error occurred");
  }
};

const cart = async (req, res) => {
  try {
    console.log(req.session.user_id);

    const result = await Cart.aggregate([
      {
        $match: { user_id: new mongoose.Types.ObjectId(req.session.user_id) },
      },
      {
        $unwind: "$Product",
      },
      {
        $lookup: {
          from: "products",
          localField: "Product.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $addFields: {
          totalPrice: {
            $multiply: ["$Product.quantity", "$productDetails.price"],
          },
        },
      },
      {
        $group: {
          _id: null,
          items: {
            $push: {
              productId: "$Product.productId",
              quantity: "$Product.quantity",
              productDetails: {
                product_name: "$productDetails.product_name",
                product_description: "$productDetails.product_description",
                price: "$productDetails.price",
                in_stock: "$productDetails.in_stock",
                product_img: "$productDetails.product_img",
              },
              totalPrice: "$totalPrice",
            },
          },
          totalAmount: { $sum: "$totalPrice" },
        },
      },
      {
        $project: {
          _id: 0,
          items: 1,
          totalAmount: 1,
        },
      },
    ]);

    const user = await User.findById(req.session.user_id);

    if (result.length > 0) {
      res.render("user/cart", {
        cartItems: result[0].items,
        totalAmount: result[0].totalAmount,
        user,
      });
    } else {
      res.render("user/cart", { cartItems: [], totalAmount: 0 });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred while fetching cart items");
  }
};

const quantityUpdate = async (req, res) => {
  try {
    const { product_id, currentQuantity } = req.body;
    console.log(product_id, currentQuantity);
    if (currentQuantity === "inc") {
      const quantityStat = await Cart.updateOne(
        {
          user_id: req.session.user_id,
          "Product.productId": product_id,
        },
        {
          $inc: { "Product.$.quantity": 1 },
        }
      );
    } else if (currentQuantity === "dec") {
      const quantityStat = await Cart.updateOne(
        {
          user_id: req.session.user_id,
          "Product.productId": product_id,
        },
        {
          $inc: { "Product.$.quantity": -1 },
        }
      );
    }
  } catch (error) {}
};

const removeItem = async (req, res) => {
  try {
    const removeId = req.params.id;
    console.log(removeId);

    console.log("this is removing route");
    const removeStat = await Cart.updateOne(
      { user_id: req.session.user_id },
      { $pull: { Product: { productId: removeId } } }
    );

    console.log(removeStat);

    if (removeStat.nModified > 0) {
      // res.redirect('/cart');
    } else {
      res.json({ message: "No changes made" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const checkOut = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.session.user_id });

    const result = await Cart.aggregate([
      {
        $match: { user_id: new mongoose.Types.ObjectId(req.session.user_id) },
      },
      {
        $unwind: "$Product",
      },
      {
        $lookup: {
          from: "products",
          localField: "Product.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$productDetails",
      },
      {
        $addFields: {
          totalPrice: {
            $multiply: ["$Product.quantity", "$productDetails.price"],
          },
        },
      },
      {
        $group: {
          _id: null,
          items: {
            $push: {
              productId: "$Product.productId",
              quantity: "$Product.quantity",
              productDetails: {
                product_name: "$productDetails.product_name",
                product_description: "$productDetails.product_description",
                price: "$productDetails.price",
                in_stock: "$productDetails.in_stock",
                product_img: "$productDetails.product_img",
              },
              totalPrice: "$totalPrice",
            },
          },
          totalAmount: { $sum: "$totalPrice" },
        },
      },
      {
        $project: {
          _id: 0,
          items: 1,
          totalAmount: 1,
        },
      },
    ]);

    if (result.length > 0) {
      console.log(result[0].totalAmount);
      console.log(user);

      res.render("user/checkout", {
        cartItems: result[0].items,
        totalAmount: result[0].totalAmount,
        user,
      });
    } else {
      res.render("user/checkout", { cartItems: [], totalAmount: 0 });
    }
  } catch (error) {}
};

// const conformOrder = async (req, res) => {
//   try {
//     console.log('Processing order...');

//     const { totalAmount, orderAddress, productIds, PaymentMethod } = req.body;
//     const currentDate = new Date();
//     const formattedDate = currentDate.toISOString().split('T')[0];
//     console.log('Order Date:', formattedDate);

//     if (!req.session.user_id) {
//       return res.status(401).json({ success: false, message: 'User not authenticated' });
//     }

//     // Find user data
//     const userData = await User.findOne({ _id: req.session.user_id });
//     if (!userData) {
//       return res.status(404).json({ success: false, message: 'User not found' });
//     }

//     const cartProduct = await Cart.findOne({ user_id: req.session.user_id });

//     console.log(`Cart Product: ${cartProduct.Product}`);

//     // Create a new order
//     const orderStatus = new Order({
//       user_id:req.session.user_id,
//       name: userData.name,
//       email: userData.email,
//       status: 'success',
//       shipment_address: orderAddress,
//       product: cartProduct.Product,
//       orderDate: formattedDate,
//       paymentMethod: PaymentMethod
//     });

//     const signupDataSuccess = await orderStatus.save();

// for (const cartItem of cartProduct.Product) {
//   const product = await Product.findOne({ _id: cartItem.productId });
//   if (product) {
//     product.in_stock -= cartItem.quantity;
//     await product.save();
//   } else {
//     console.log(`Product not found: ${cartItem.productId}`);
//   }
// }

//     const cartDelete=await Cart.deleteOne({user_id:req.session.user_id});

//     if (signupDataSuccess) {
//       console.log('Order saved successfully');
//       return res.status(200).json({ success: true, message: 'Order confirmed' });
//     }

//     // If the save fails
//     return res.status(500).json({ success: false, message: 'Order confirmation failed' });

//   } catch (error) {
//     console.error('Error processing order:', error);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

const orderSuccess = async (req, res) => {
  try {
    res.render("user/orderComplete");
  } catch (error) {
    console.error("Error rendering order success page:", error.message);
    res.status(500).send("Server error");
  }
};

// const myOrders = async (req, res) => {
//   try {
//       const orders = await Order.find({ user_id: req.session.user_id });
//       console.log('myOrders');
//       res.render('user/myOrders', { myOrders: orders });
//   } catch (error) {
//       console.error(error);
//       res.status(500).send('Server Error');
//   }
// }

const createOrder = async (req, res) => {
  try {
    const { orderAddress, PaymentMethod } = req.body;

    const userId = req.session.user_id; // Assuming user ID is stored in session

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    // Find user data

    const userData = await User.findById(userId);
    if (!userData) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Find cart for the user
    const cartProduct = await Cart.findOne({ user_id: userId });

    if (!cartProduct || cartProduct.Product.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // Create new order
    const order = new Order({
      user_id: userId,
      name: userData.name,
      email: userData.email,
      status: "pending", // Default status
      shipment_address: orderAddress,
      product: cartProduct.Product.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        status: "pending", // Default status for each product
      })),
      paymentMethod: PaymentMethod,
    });

    const savedOrder = await order.save();

    // Update product stock
    for (const item of cartProduct.Product) {
      const product = await Product.findById(item.productId);
      if (product) {
        product.in_stock -= item.quantity;
        await product.save();
      } else {
        console.log(`Product not found: ${item.productId}`);
      }
    }

    // Clear the cart
    await Cart.deleteOne({ user_id: userId });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: savedOrder,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getOrderHistory = async (req, res) => {
  try {
    const userId = req.session.user_id;

    if (!userId) {
      return res
        .status(401)
        .render("error", { message: "User not authenticated" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).render("error", { message: "User not found" });
    }

    const orders = await Order.aggregate([
      { $match: { email: user.email } },
      {
        $lookup: {
          from: "products",
          localField: "product.productId",
          foreignField: "_id",
          as: "newone",
        },
      },
      // Add this stage to sort orders by orderDate in descending order
      { $sort: { orderDate: -1 } },
    ]);

            
    
    if (orders.length === 0) {
      console.log("No orders found for user:", userId);
    }

    let toast = req.flash("info");
    res.render("user/myOrders", { orders, toast });
  } catch (error) {
    console.error("Error in getOrderHistory:", error);
    res.status(500).render("error", {
      message: "An error occurred while fetching order history",
    });
  }
};

const cancellProductStatus = async (req, res) => {
  try {
    const { object_id, product_id } = req.body;

    console.log("hello");
    // Find the order by its ID
    const order = await Order.findOne({ _id: object_id });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const productIndex = order.product.findIndex(
      (p) => p._id.toString() === product_id
    );

    if (productIndex === -1) {
      return res
        .status(404)
        .json({ message: "Product not found in the order" });
    }

    const quantity = order.product[productIndex].quantity;

    order.product[productIndex].status = "cancelled";

    const product = await Product.findOne({
      _id: order.product[productIndex].productId,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.in_stock += quantity;

    await order.save();
    await product.save();

    req.flash("info", "order cancelled successfully");
    res.redirect("/getOrderHistory");
  } catch (error) {
    console.error("Error updating product status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  login,
  loginData,
  userBlocked,
  signup,
  signupData,
  otpSending,
  otpData,
  home,
  shopmore,
  logout,
  singleProduct,
  homeLogin,
  profile,
  ProfileNameUpdate,
  ProfileUpdateEmail,
  profileOtpsumbit,
  profilenewPass,
  
  forgotPassword,
  forgotEmail,
  forgetRestpassword,
  loadforgetpassword,
  manageaddress,
  newaddress,
  editAddress,
  addressDelete,
  addTocart,
  cart,
  quantityUpdate,
  removeItem,
  checkOut,
  createOrder,
  orderSuccess,
  getOrderHistory,
  cancellProductStatus,
 
  // getOrderHistory
};
