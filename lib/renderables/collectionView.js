'use strict';

var Collection = require('ampersand-collection');
var SubCollection = require('ampersand-subcollection');
var React = require('react');
var merge = require('lodash.merge');
var view = require('./view');
var constructCollection = require('../util/ensureInstance').collection;

module.exports = function(config) {
  if (config == null) {
    throw new Error('config parameter is required');
  }
  if (config.itemView == null) {
    throw new Error('itemView attribute is required');
  }

  // items = array of item views
  // collection = ampersand collection
  var CollectionViewMixin = {
    propTypes: {
      collection: React.PropTypes.oneOfType([
        React.PropTypes.arrayOf(React.PropTypes.object),
        React.PropTypes.instanceOf(Collection)
      ]),
      query: React.PropTypes.object,
      offset: React.PropTypes.number,
      limit: React.PropTypes.number,
      where: React.PropTypes.object,
      filter: React.PropTypes.func,
      filters: React.PropTypes.arrayOf(React.PropTypes.func),
      watch: React.PropTypes.arrayOf(React.PropTypes.string),
      sort: React.PropTypes.oneOfType([
        React.PropTypes.string,
        React.PropTypes.func
      ])
    },

    // most options can be passed via config or props
    // props takes precedence
    getDefaultProps: function(){
      return {
        collection: config.collection,
        query: config.query,
        offset: config.offset,
        limit: config.limit,
        where: config.where,
        filter: config.filter,
        filters: config.filters,
        watch: config.watch,
        sort: config.sort
      };
    },

    // on component mount we initialize everything
    componentWillMount: function() {
      this._initialize();
      this._computeItemsWithContext();
    },

    componentWillReceiveProps: function(nextProps) {
      this._configureItems(nextProps);
    },

    componentWillUpdate: function(){
      this._computeItemsWithContext();
    },

    _initialize: function() {
      // get sync and create collection based on model
      // model passed in via props or config
      var collection = constructCollection(this.props.collection, this.props);

      var setCollection = (function() {
        this.collection = collection;
        // create items sub-collection
        this._items = new SubCollection(this.collection);
        this._configureItems(this.props);
        this.listenTo(this._items, 'add change remove sort', this.tryUpdate);
        if (this.collectionDidFetch) {
          this.collectionDidFetch();
        }
        this.tryUpdate();
      }).bind(this);

      // TODO: error handling and event hooks
      collection.fetch({
        success: setCollection
      });
    },


    // internal fn to sync props to shadow collection
    _configureItems: function(props) {
      if (typeof props !== 'object') {
        throw new Error('_configureItems called with invalid props');
      }
      this._items.configure({
        where: props.where,
        filter: props.filter,
        limit: props.limit,
        offset: props.offset,
        comparator: props.sort
      }, true);
    },

    // internal fn to sync this.items with collection
    _computeItemsWithContext: function() {
      React.withContext(this.context, this._computeItems);
    },
    _computeItems: function() {
      // TODO: switch to map when available
      // https://github.com/AmpersandJS/ampersand-subcollection/issues/31
      this.items = this._items.map(function(m, idx) {
        var fissionProps = {
          model: m,
          index: idx,
          key: m.cid
        };

        // if itemview props transform, use that merged w/ defaults
        // otherwise just defaults
        var itemProps = this.getItemViewProps ?
          merge(this.getItemViewProps(m, idx), fissionProps) :
          fissionProps;

        return this.itemView(itemProps);
      }, this);
    }
  };

  return view(config, [CollectionViewMixin]);
};