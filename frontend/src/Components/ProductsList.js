import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { getFormValues } from 'redux-form';
import { fetchProducts } from '../Actions';
import ProductCard from './ProductCard';
import Pagination from './Pagination';
import _ from 'lodash';

class ProductsList extends Component {
  componentDidMount() {
    //fetch products takes an options object as argument
    this.props.fetchProducts({});
  }

  renderProducts() {
    //redux promise returns true when it doesn't resolve promise?
    if (this.props.products === true) {
      return <div>Uh oh something went wrong!</div>
    }

    return _.map(this.props.products, product => (
      <ProductCard key={product._id} product={product} />
    ));
  }

  render() {
    return (
      <div className='container'>
        <div className='row'>
          {this.renderProducts()}
        </div>
        <Pagination 
          numberOfPages={this.props.totalPages} 
          currentPage={this.props.pageNum} 
          currentCategory={this.props.currentCategory}
          currentSort={this.props.currentSort}
          fetchProducts={this.props.fetchProducts} 
        />
      </div>
    )
  }
}

function mapStateToProps(state) {
  return {
    products: state.productData.products,
    pageNum: state.productData.pageNum,
    totalPages: state.productData.totalPages,
    currentCategory: getFormValues('selectCategory')(state),
    currentSort: getFormValues('sortOptions')(state)
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ fetchProducts }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(ProductsList);