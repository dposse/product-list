const router = require('express').Router()
const faker = require('faker')
const Product = require('../models/product')
const Review = require('../models/review')

const ITEMS_PER_PAGE = 9;

//NEED TO ADD RANDOM REVIEWS
router.get('/generate-fake-data', (req, res, next) => {
  for (let i = 0; i < 90; i++) {
    let product = new Product()

    product.category = faker.commerce.department()
    product.name = faker.commerce.productName()
    product.price = faker.commerce.price()
    product.image = 'https://www.oysterdiving.com/components/com_easyblog/themes/wireframe/images/placeholder-image.png'
    product.reviews = []

    const numReviews = Math.floor(Math.random() * Math.floor(3));

    for (let j = 0; j < numReviews; j++) {
      const review = new Review()
      review.username = faker.internet.userName();
      review.text = faker.lorem.sentence();
      review.product = product._id;
      review.save((err) => {
        if (err) throw err
      })

      product.reviews.push(review);
    }

    product.save((err) => {
      if (err) throw err
    })
  }
  res.end()
})

router.get('/products', (req, res, next) => {
  const pageNum = req.query.page || 1;
  //validate pageNum - must be >= 1
  if (pageNum < 1) {
    return res.status(400).send('Invalid page number.');
  }

  const numItemsToSkip = (pageNum - 1) * ITEMS_PER_PAGE;
  
  Product.find()
    .skip(numItemsToSkip)
    .limit(ITEMS_PER_PAGE)
    .exec((err, products) => {
      if (err) throw err;

      Product.countDocuments()
        .exec((err, count) => {
          //now have access to total product count for future use
          if (err) return next(err);
          res.send(products);
        })
    })
})

//return product by id
router.get('/products/:product', (req, res, next) => {
  //read product from path
  const productId = req.params.product;

  //validate - not sure if this would ever happen?
  if (!productId) {
    return res.status(400).send('Invalid id');
  }

  //search mongoose
  Product.findOne({ _id: productId })
    .exec((err, product) => {
      if (err) {
        return res.status(404).send(err);
      }
      //if no result, 404
      if (!product) {
        return res.status(404).send('Product not found.');
      }
      //return result
      res.status(200).send(product);
    });

});

module.exports = router


  //can be deleted, kept for reference to know what is working 
  // //add a review for testing
  // Product.findOne()
  //   .exec((err, product) => {
  //     const review = new Review({
  //       userName: 'test',
  //       text: 'test',
  //       product: product._id
  //     });

  //     review.save();

  //     product.reviews.push(review);

  //     product.save((err, result) => {
  //       console.log(result);
  //     });
  //   })