const router = require('express').Router()
const faker = require('faker')
const Product = require('../models/product')
const Review = require('../models/review')
const mongoose = require('mongoose')

const PRODUCTS_PER_PAGE = 9;
const REVIEWS_PER_PAGE = 40;

let CATEGORIES;

//get categories from the database on load
Product.distinct('category', (err, categories) => {
  if (err) throw err;
  console.log('Saving all possible categories from database collections', categories);
  CATEGORIES = categories;
});

router.get('/generate-fake-data', (req, res, next) => {
  for (let i = 0; i < 90; i++) {
    let product = new Product()

    product.category = faker.commerce.department()
    product.name = faker.commerce.productName()
    product.price = faker.commerce.price()
    product.image = faker.image.image()
    product.reviews = []
    product.enabled = true

    const numReviews = Math.floor(Math.random() * Math.floor(3));

    for (let j = 0; j < numReviews; j++) {
      const review = new Review()
      review.username = faker.internet.userName();
      review.text = faker.lorem.sentence();
      review.product = product._id;
      review.enabled = true;
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
  const pageNum = +req.query.page || 1;
  //validate pageNum - must be >= 1
  if (pageNum < 1) {
    return res.status(400).send('Invalid page number.');
  }

  const numItemsToSkip = (pageNum - 1) * PRODUCTS_PER_PAGE;
  //build search query
  const { category, price } = req.query;
  const searchQuery = { enabled: true };
  if (category) {
    searchQuery.category = category;
  }
  //build sort
  const sortOptions = {};
  if (price) {
    if (price ==='highest') {
      sortOptions.price = 'descending';
    } else if (price ==='lowest') {
      sortOptions.price = 'ascending';
    } else {
      return res.status(400).send('Invalid price sorting option.');
    }
  }
  
  Product.find(searchQuery)
    .skip(numItemsToSkip)
    .limit(PRODUCTS_PER_PAGE)
    .sort(sortOptions)
    .exec((err, products) => {
      if (err) throw err;

      Product.countDocuments(searchQuery)
        .exec((err, count) => {
          if (err) return next(err);
          //calculate number of pages so client doesn't have to
          const totalPages = Math.ceil(count/PRODUCTS_PER_PAGE);
          res.send({
            count,
            pageNum,
            totalPages,
            products,
            categories: CATEGORIES,
            sortedByPrice: (sortOptions.price) ? 
              (sortOptions.price ==='ascending') ? 'lowest' : 'highest'
              : null
          });
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

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).send('Invalid id');
  }

  //search mongoose
  Product.findById(productId)
    .populate('reviews')
    .exec((err, product) => {
      if (err) {
        return res.status(404).send(err);
      }
      //if no result or not enabled, 404
      if (!product || product.enabled === false) {
        return res.status(404).send('Product not found.');
      }
      //return result
      res.status(200).send(product);
    });

});

//paginate like products
router.get('/reviews', (req, res, next) => {
  const pageNum = req.query.page || 1;
  //validate pageNum - must be >= 1
  if (pageNum < 1) {
    return res.status(400).send('Invalid page number.');
  }

  const numItemsToSkip = (pageNum - 1) * REVIEWS_PER_PAGE;
  
  Review.find({ enabled: true })
    .skip(numItemsToSkip)
    .limit(REVIEWS_PER_PAGE)
    .exec((err, reviews) => {
      if (err) throw err;
      Review.countDocuments((err, count) => {
        if (err) throw err;
        res.status(200).send({
          totalReviews: count,
          reviewsOnPage: reviews.length,
          reviews
        });
      });
    });
});

router.post('/products', (req, res, next) => {
  //validate request body
  //if nothing sent, req.body is empty object
  if (Object.keys(req.body).length === 0) {
    return res.status(400).send('Invalid post body');
  }

  if (!req.body.name ||
      !req.body.category ||
      !req.body.price ||
      !req.body.image ) {
    return res.status(400).send('Invalid post body');
  }

  //create new post with data, needs reviews [] and enabled
  const newProduct = new Product({
    category: req.body.category,
    name: req.body.name,
    price: req.body.price,
    image: req.body.image,
    reviews: [],
    enabled: true
  });

  //return copy of sent data on success
  newProduct.save((err, result) => {
    if (err) throw err;
    return res.status(200).send(result);
  });
});

router.post('/:product/reviews', (req, res, next) => {
  //validate product param
  const productId = req.params.product;

  //validate - not sure if this would ever happen?
  if (!productId) {
    return res.status(400).send('Invalid id');
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).send('Invalid id');
  }

  //validate review
  if (Object.keys(req.body).length === 0) {
    return res.status(400).send('Invalid post body');
  }

  if (!req.body.userName ||
      !req.body.text) {
    return res.status(400).send('Invalid post body');
  }

  //create new review
  const newReview = new Review({
    userName: req.body.userName,
    text: req.body.text,
    product: mongoose.Types.ObjectId(productId),
    enabled: true
  });

  //make sure product is found/ not disabled
  Product.findByIdAndUpdate(productId, {$push: {reviews: newReview._id}}, {new: true}, (err, product) => {
    if (err) throw err;
    if (!product || product.enabled === false) {
      return res.status(404).send('Product not found.');
    }

    //save after validation; don't want a review to save if product does not exist or is not enabled
    newReview.save((err, result) => {
      if (err) throw err;
    });

    //this currently sends back product before it is updated
    return res.status(200).send(product);
  });
});

router.delete('/products/:product', (req, res, next) => {
  //validate param
  const productId = req.params.product;

  if (!productId) {
    return res.status(400).send('Invalid id');
  }

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).send('Invalid id');
  }

  //find by id, update enabled to false
  Product.findByIdAndUpdate(productId, {enabled: false, updated_at: new Date()}, (err, product) => {
    if (err) throw err;
    if (!product || product.enabled === false) {
      return res.status(404).send('Product not found.');
    }

    product.reviews.forEach(review => {
      //find by id and update to enabled: false
      Review.findByIdAndUpdate(review, {enabled: false, updated_at: new Date()}, (err, r) => {
        if (err) throw err;
      });
    });

    return res.status(200).send(product);
  });
});

router.delete('/reviews/:review', (req, res, next) => {
  //validate review
  const reviewId = req.params.review;

  if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
    return res.status(400).send('Invalid id');
  }

  //find by id, update enabled to false
  Review.findByIdAndUpdate(reviewId, {enabled: false, updated_at: new Date()}, (err, review) => {
    if (err) throw err;
    if (!review || review.enabled === false) {
      return res.status(404).send('Product not found.');
    }

    Product.update(
      { _id: review.product, reviews: review._id },
      { $pull: { reviews: review._id } },
      { multi: true },
      (err, status) => {
        if (err) throw err;
        console.log('Success', status);
      }
    );

    return res.status(200).send(review);
  });
});

module.exports = router