const User = require("../model/userModer");
const bcrypt = require("bcryptjs");
const { resizeImages } = require("../config/imageResizing");
const Product = require("../model/productModel");
const Category = require("../model/categoryModel");
const Order = require("../model/orders.model");
const path = require("path");
const fs = require("fs");
const { log, error } = require("console");
const Coupons=require('../model/couponModel')
require("passport");

// ADMIN LOGIN  //GET

const adminLogin = async (req, res) => {
  try {
    const toast = ["Admin Login"];
    res.render("admin/adminLogin", { toast });
  } catch (error) {
    console.error("Error rendering admin login page:", error);
    res.status(500).send("Internal Server Error");
  }
};

const adminLogindata = async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await User.findOne({ email: email });

    if (!admin) {
      const toast = ["Invalid email or password"];
      return res.render("admin/adminLogin", { toast });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      const toast = ["Wrong password"];
      return res.render("admin/adminLogin", { toast });
    }

    if (admin.is_admin === 1) {
      req.session.admin_id = admin._id;
      console.log(req.session.admin_id);
      req.flash("info", "✅ login successful");
      return res.redirect("/dashboard");
    } else {
      const toast = ["You are not an admin"];
      return res.render("admin/adminLogin", { toast });
    }
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .render("admin/adminLogin", { toast: ["Server error"] });
  }
};

// DASHBORD // GET

const dashBord = async (req, res) => {
  try {
    console.log(req.session.admin_id);
    const toast = req.flash("info");
    res.render("admin/adminDashbord", { toast });
  } catch (error) {
    console.log(error.message);
    res.render("/404");
  }
};

// USERMANGMENT:  ALL USER LIST // GET

const userList = async (req, res) => {
  try {
    const allUser = await User.find({});
    const toast = req.flash("info");
    res.render("admin/userList", { users: allUser, toast });
  } catch (error) {
    console.error(error);
    res.status(500).render("admin/userList", { message: "Server error" });
  }
};

// USERMANGMENT:  BLOCK // POST

const blockUser = async (req, res) => {
  try {
    const { userId, newStatus } = req.body;

    const result = await User.updateOne(
      { _id: userId },
      { $set: { is_ban: newStatus } }
    );
    if (result) {
      if (newStatus == 1) {
        req.flash("info", "✅ User has been Blocked successfully");
      } else if (newStatus == 0) {
        req.flash("info", "✅ User has been Unblocked successfully");
      }

      res.redirect("/userList");
    }
  } catch (error) {
    console.log(error.message);
  }
};

// PRODUCTSMANGMENT :ALL PRODUCTS LIST //GET

const products = async (req, res) => {
  try {
    const productData = await Product.find({});
    if (productData) {
      const toast = req.flash("info");
      res.render("admin/allProduct", { Product: productData, toast });
    }
  } catch (error) {
    console.log(error.message);
  }
};

// PRODUCTSMANGMENT :ADD PRODUCTS  //GET

const addProduct = async (req, res) => {
  try {
    const category = await Category.find({});

    res.render("admin/addProduct", { category: category });
  } catch (error) {
    console.log(error.message);
  }
};

// PRODUCTSMANGMENT :NEW PRODUCTS  //POST

// = async (req, res) => {
//   try {
//     const {
//       productName,
//       productCategory,
//       ProductDescription,
//       productPrice,
//       Stock,
//       Brand,
//     } = req.body;
//     const files = req.files;
//     const resizedPaths = await resizeImages(files);

//     const response = resizedPaths.map((path, index) => ({
//       original: files[index].path,
//       resized: path,
//     }));

//     const relativePaths = resizedPaths.map((path) =>
//       path.replace(
//         "C:\\Users\\Abhiram\\Desktop\\WIZCART - Copy (2)\\public\\resizeImg\\",
//         ""
//       )
//     );

//     const bdImg = relativePaths.map((relativePath) =>
//       path.join("resizeImg", relativePath)
//     );

//     const productDetails = new Product({
//       product_name: productName,
//       product_description: ProductDescription,
//       category_name: productCategory,
//       brands: Brand,
//       price: productPrice,
//       in_stock: Stock,
//       product_img: bdImg,
//       Hide_product: 0,
//     });

//     const singupdataSucess = await productDetails.save();

//     res.redirect("/Products");
//   } catch (err) {
//     console.error("Error processing images:", err);
//   }
// };

// // PRODUCTSMANGMENT :EDIT PRODUCTS  //POST

let id;
const editProduct = async (req, res) => {
  try {
    id = req.body.id;

    res.redirect("/editProductForm");
  } catch (error) {
    console.log(error.message);
  }
};

// PRODUCTSMANGMENT :EDIT PRODUCTS  //GET

const editProductForm = async (req, res) => {
  try {
    const productData = await Product.findById({ _id: id });
    if (productData) {
      res.render("admin/editProduct", { product: productData, id: id });
      id = null;
    }
  } catch (error) {}
};

// PRODUCTSMANGMENT :EDITED DATA // POST

// PRODUCTSMANGEMENT:  DELETE IMAGE IN EDITING PAGE  //POST

const deleteImg = async (req, res) => {
  try {
    const { imageIndex, productId } = req.body;
    console.log(imageIndex, productId);

    let productKey = `product_img.${imageIndex}`;

    const unsetResult = await Product.updateOne(
      { _id: productId },
      { $unset: { [productKey]: 1 } }
    );

    if (unsetResult.modifiedCount === 0) {
      return res.status(404).send("Image not found");
    }

    const pullResult = await Product.updateOne(
      { _id: productId },
      { $pull: { product_img: null } }
    );

    if (pullResult.modifiedCount > 0) {
      // // Delete the file from the file system

      //  const uploadsDir = path.join(__dirname, '..', 'public', productKey);

      // fs.unlink(uploadsDir, (err) => {
      //   if (err) {
      //     console.error(`Error deleting ${uploadsDir} file:`, err);
      //   } else {
      //     console.log(`${uploadsDir} was deleted successfully`);
      //   }
      // });
      req.flash("info", " 🗑️ image delete successfully ");
      res.redirect("/Products");
    } else {
      res.status(404).send("Image not found");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred");
  }
};

// PRODUCTSMANGEMENT: HIDE (SOFTDELETE)  //POST

const hideProduct = async (req, res) => {
  try {
    const id = req.body._id;
    const a = await Product.findById(id);
    console.log(`this is ${a}`);
    const hidden = await Product.findByIdAndUpdate(
      id,
      { $set: { Hide_product: 1 } },
      { new: true }
    );
    if (hidden) {
      req.flash("info", "Product was Hide  successfully ✔️ ");
      res.redirect("/Products");
    }
  } catch (error) {
    console.log(error.message);
  }
};

// PRODUCTSMANGEMENT: UNHIDE (REMOVE SOFTDELETE)  //POST

const unHide = async (req, res) => {
  try {
    const id = req.body._id;
    console.log("hello");
    const unhidden = await Product.findByIdAndUpdate(
      id,
      { $set: { Hide_product: 0 } },
      { new: true }
    );
    if (unhidden) {
      req.flash("info", "Product was unhide  successfully ✔️ ");
      res.redirect("/Products");
    }
  } catch (error) {
    console.log(error.message);
  }
};

// PRODUCTSMANGEMENT: UNHIDE (REMOVE SOFTDELETE)  //POST

const deleteProduct = async (req, res) => {
  try {
    let id = req.body._id;
    let productData = await Product.deleteOne({ _id: id });

    if (productData) {
      req.flash("info", " 🗑️ Product was Delete succesfully ");
      res.redirect("/Products");
    }
  } catch (error) {}
};

// CATEGORYMANGEMENT :SHOW CATEGORY //GET

const category = async (req, res) => {
  try {
    const categories = await Category.find({});
    if (categories) {
      const toast = req.flash("info");
      res.render("admin/category", { categories, toast });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
};

// CATEGORYMANGEMENT :DELETE CATEGORY //GET

const deleteCategory = async (req, res) => {
  try {
    const id = req.body.id;

    const status = await Category.deleteOne({ _id: id });
    if (status.deletedCount > 0) {
      req.flash("info", " 🗑️  Category Delete succesfully ");
      res.redirect("/category");
    } else {
      res.status(404).send("Category not found");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

// CATEGORYMANGEMENT :ADD NEW CATEGORY //POST
const addCategory = async (req, res) => {
  try {
    const { newCategory } = req.body;
    
    // Create a regular expression for case-insensitive match
    const regex = new RegExp(`^${newCategory}$`, 'i');

    const is_exist = await Category.findOne({ category_name: regex });
    if (is_exist) {
      req.flash(
        "info",
        `${newCategory} ❗The Category name already exists. Please enter a different name.`
      );
      return res.redirect("/category");
    }

    const newCategoryDetails = new Category({
      category_name: newCategory,
      Hide_category: 0,
    });

    const status = await newCategoryDetails.save();

    if (status) {
      req.flash("info", `${newCategory} was added successfully ✅`);
      res.redirect("/category");
    } else {
      res.status(404).send("Category not found");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};


// CATEGORYMANGEMENT :HIDE CATEGORY (SOFT DELETE) //POST

const hideCategory = async (req, res) => {
  try {
    const id = req.body.id;

    const status = await Category.updateOne(
      { _id: id },
      { $set: { Hide_category: 1 } }
    );
    if (status) {
      req.flash("info", ` Category was hide  succesfully ✅`);

      res.redirect("/category");
    } else {
      res.status(404).send("Category not found");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

// CATEGORYMANGEMENT :UNHIDE CATEGORY (REMOVE SOFT DELETE) //POST

const showCategory = async (req, res) => {
  try {
    const id = req.body.id;

    const status = await Category.updateOne(
      { _id: id },
      { $set: { Hide_category: 0 } }
    );
    if (status) {
      req.flash("info", ` Category was Unhide  succesfully ✅`);
      res.redirect("/category");
    } else {
      res.status(404).send("Category not found");
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Server Error");
  }
};

// categoryEdit

const editCategory = async (req, res) => {
  try {
    const { editCategoryName, edit_id } = req.body;

    console.log(editCategoryName);
    console.log(edit_id);

    const status = await Category.updateOne(
      { _id: edit_id },
      { $set: { category_name: editCategoryName } }
    );

    if (status.nModified > 0) {
      req.flash("info", "Category name was successfully changed ✅");
      res.redirect("/category");
    } else {
      req.flash("error", "No changes were made or category not found.");
      res.redirect("/category");
    }
  } catch (error) {
    console.error(error);
    req.flash("error", "An error occurred while updating the category.");
    res.redirect("/category");
  }
};

// LOGOUT

const logout = async (req, res) => {
  try {
    console.log(req.session.admin_id);
    req.session.destroy();
    req.flash("info", ` LogOut succesfully ✅`);
    res.redirect("/admin");
  } catch (error) {
    console.log(error.message);
  }
};

const orderMangement = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();

    const orders = await Order.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product.productId",
          foreignField: "_id",
          as: "newone",
        },
      },
      { $sort: { orderDate: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]);

    

    res.render("admin/oderMangement", {
      orders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      limit: limit,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const updateStatus = async (req, res) => {
  try {
    const { product_id, object_id, status } = req.body;
    console.log(object_id);

    console.log("hello");
    const order = await Order.findOne({ _id: object_id });

    const productIndex = order.product.findIndex(
      (p) => p._id.toString() === product_id
    );

    if (productIndex === -1) {
      return res
        .status(404)
        .json({ message: "Product not found in the order" });
    }

    const quantity = order.product[productIndex].quantity;

    order.product[productIndex].status = status;

    const product = await Product.findOne({
      _id: order.product[productIndex].productId,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.in_stock += quantity;

    await order.save();
    await product.save();

    res.redirect("/orderMangement");
  } catch (error) {
    console.log(error.message);
  }
};

const singelOderhistory = async (req, res) => {
  try {
    console.log("hello");

    const oderId = req.query.oderId;
    const productIndex = req.query.productIndex;
    console.log(
      `this is my order id ${oderId}/n this is my productIndex ${productIndex}`
    );
  } catch (error) {
    console.log(error.message);
  }
};

const couponMangemnt= async (req,res)=>{
  try {

    const coupon= await Coupons.find({})
    let toast = req.flash('info') || []; 

   
    res.render('admin/Coupons',{coupons:coupon,toast})
    
  } catch (error) {
     console.log(error.message);
     
  }
}



const createCoupon= async (req,res)=>{
  try {
    
    const{couponCode,
      discount,
      expiryDate,
      description,
      minPurchaseAmount}=req.body



      const newcoupon= new Coupons({
        Coupon_Code:couponCode,
        discount_Price:discount,
        expiry_Date:expiryDate,
        Description:description,
        minPurchaseAmount:minPurchaseAmount,
        is_active:true,
      })


        const result= await newcoupon.save()
       if(result){
        res.status(200).json({ message: 'Coupon created successfully!'});
       }
        console.log(result);
        
      
  } catch (error) {
    console.log(error.message)
  }
}

const deleteCoupon= async (req,res)=>{
    try {
      const id=req.body.id 
 
     const isDelete=await Coupons.findByIdAndDelete(id)
       
     if(isDelete){
      res.status(200).json({ message: 'Coupon deleted successfully' });
     }else{
      res.status(500).json({ error: 'Coupon deleted successfully' });

     }
     
    } catch (error) {
      console.log(error);
      
    }
}
const unhideCoupon = async (req, res) => {
  try {
    console.log('This is unhide coupon controller');
    const id = req.body.Unhide_id;
    console.log(id);

    const isShow = await Coupons.updateOne({ _id: id }, { $set: { is_active: true } });

    if (isShow) {
      res.status(200).json({ message: 'Coupon unhidden successfully' });
    } 
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'An error occurred while unhiding the coupon' });
  }
};




const hideCoupon = async (req, res) => {
  try {
    console.log('This is hide coupon controller');
    const id = req.body.hide_id;
    console.log(id);

    const isShow = await Coupons.updateOne({ _id: id }, { $set: { is_active: false } });

    if (isShow) {
      res.status(200).json({ message: 'Coupon hidden successfully' });
    } 
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'An error occurred while hiding the coupon' });
  }
};

const updateCoupon=async(req,res)=>{
  try {
    log('helloiujghyuifiiiiiifififififififififififififififif')
    const{edit_id,Edit_couponCode,Edit_discount,Edit_expiryDate,Edit_minPurchaseAmount,Edit_description}=req.body
   
     
      const edit=await Coupons.updateOne({_id:edit_id},{$set:{Coupon_Code:Edit_couponCode,discount_Price:Edit_discount,expiry_Date:Edit_expiryDate, minPurchaseAmount:Edit_minPurchaseAmount,Description:Edit_description}})
if(edit){

      req.flash('info', 'Coupon edited successfully ✅');
  res.redirect('/couponMangement')

}

    
  } catch (error) {
    
  }
}


module.exports = {
  adminLogin,
  adminLogindata,
  dashBord,
  userList,
  blockUser,
  addProduct,
  products,
  deleteImg,
  editProduct,
  editProductForm,
  deleteProduct,
  hideProduct,
  unHide,
  category,
  deleteCategory,
  addCategory,
  hideCategory,
  showCategory,
  editCategory,
  orderMangement,
  updateStatus,
  singelOderhistory,
  createCoupon,
  couponMangemnt,
  deleteCoupon,
 unhideCoupon,
 hideCoupon,
 updateCoupon,
  logout,
};
