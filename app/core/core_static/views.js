/**
 * View base class that automatically cleans up its sub-views.
 */
App.NestedView = Backbone.View.extend({
    name: 'NestedView',
    close: function () {
        App.debug('Closing ' + this.cid);
        this.remove();
        // Unbind any objects listening to this
        this.unbind();
        // Unbind any objects this is listening to
        this.stopListening();
        this.closeSubViews();
        this.onClose();
    },
    closeSubViews: function () {
        if (this.subViews) {
            _.each(this.subViews, function (view) {
                if (typeof(view.close) !== 'undefined') {
                    view.close();
                }
            });
        }
    },
    onClose: function () {
    },
    addSubView: function (subView) {
        if (!this.subViews) {
            this.subViews = [];
        }
        this.subViews.push(subView);
    }
});

/**
 * View to display error messages
 */
App.ErrorListView = Backbone.View.extend({
    name: 'ErrorListView',
    template: _.template($('#tpl-error-view').html()),
    initialize: function (options) {
        App.debug('App.ErrorListView.initialize()');
        this.listenTo(this.collection, 'add', this.onAdd);
        this.listenTo(this.collection, 'remove', this.onRemove);
        this.render();
    },
    render: function () {
        this.$el.html(this.template);
        this.setVisibility();
    },
    onAdd: function (model) {
        var view = new App.ErrorView({"model":model});
        this.$('ul').append(view.$el);
        this.setVisibility();
    },
    onRemove: function () {
        this.setVisibility();
    },
    setVisibility: function () {
        if (this.collection.length == 0) {
            this.$el.hide();
        } else {
            this.$el.show();
        }
    }
});

/**
 * Single error message
 */
App.ErrorView = Backbone.View.extend({
    tagName: 'li',
    initialize: function (options) {
        this.render();
    },
    render: function () {
        this.$el.html(this.model.get('message'));
    }
})

/**
 * Login form.
 */
App.LoginView = App.NestedView.extend({
    name: 'LoginView',

    template: _.template($('#tpl-login-view').html()),
    
    initialize: function (options) {
        App.debug('App.LoginView.initialize()');
        this.options = options || {};
        _.bindAll(this, 'render');
        _.bindAll(this, 'login');
        _.bindAll(this, 'error');
        this.model.on('unauthorized', this.error)
        this.render();
    },
    
    events: {
        'submit form': 'login'
    },
    
    render: function () {
        App.debug('App.LoginView.render()');
        this.$el.html(this.template());
        var $el = this.$el;
        _.defer(function () {
            $('input[name=username]', $el).focus();
        });
        return this;
    },
    
    login: function (event) {
        App.debug('App.LoginView.login()');
        // Allow default to enable passsword saving
        // See: http://stackoverflow.com/questions/5430129/how-to-make-chrome-remember-password-for-an-ajax-form
        //event.preventDefault();
        var that = this;
        _.defer(function () {
            username = $('input[name=username]', that.$el).val();
            password = $('input[name=password]', that.$el).val();
            $('input[name=username]', that.$el).val('');
            $('input[name=password]', that.$el).val('');
            that.model.signIn({username:username, password:password});
            var progress = _.template($('#tpl-progress').html());
            that.$('.message').html(progress());
            that.$('form').hide();
        });
    },
    
    error: function (message) {
        this.$('.message').html('<p class="text-danger">' + message + '</p>');
        this.$('form').show()
        this.$('input[name=username]').focus();
    }
});

App.LegendView = Backbone.View.extend({
    name: 'LegendView',
    tagName: 'ul',
    initialize: function (options) {
        this.render();
    },
    render: function () {
        var that = this;
        this.$el.addClass('query-legend');
        this.collection.each(function (model) {
            this.onAdd(model);
        });
        this.listenTo(this.collection, "add", this.onAdd);
        this.listenTo(this.collection, "reset", function () {
            $('.query-legend').html("");
            that.collection.each(function (model) {
                that.onAdd(model);
            });
        });
    },
    onAdd: function (model) {
        var that = this;
        console.log('Adding legend model')
        $('.query-legend').each(function () {
            var $el = $(this);
            var li = $('<li>');
            li.html('<span class="glyphicon glyphicon-certificate query-color"></span> <span class="query-title"></span>');
            $('.query-title', li).text(model.getName());
            $('.query-color', li).css('color', model.getColor());
            $el.append(li);
            that.listenTo(model, 'change', function () {
                $('.query-title', li).text(model.getName());
            })
            that.listenTo(model, 'remove', function () {
                li.remove();
            });
        });
    }
});

/**
 * Controls drop-down menu
 */
App.ControlsView = App.NestedView.extend({
    name: 'ControlsView',
    tagName: 'ul',
    initialize: function (options) {
        App.debug('App.ControlsView.initialize()');
        this.options = options || {};
        this.userModel = options.userModel;
        _.bindAll(this, 'render');
        // Add listeners
        this.userModel.on('change:authenticated', this.render);
        // Render
        this.render();
    },
    render: function () {
        App.debug('App.ControlsView.render()');
        // Reset sub-views
        this.closeSubViews();
        // Recreate sub-views
        if (this.userModel.get('authenticated')) {
            // Create sub-views
            this.controlsSignOutView = new App.ControlsSignOutView({ userModel: this.userModel });
            this.addSubView(this.controlsSignOutView);
            this.$el.append(this.controlsSignOutView.el);
        } else {
            this.controlsSignInView = new App.ControlsSignInView({ userModel: this.userModel });
            this.addSubView(this.controlsSignInView);
            this.$el.append(this.controlsSignInView.el);
        }
        return this;
    }
});

App.ControlsSignOutView = App.NestedView.extend({
    name: 'ControlsSignOutView',
    tagName: 'li',
    template: _.template($('#tpl-controls-sign-out-view').html()),
    events: {
        'click a': 'signOut'
    },
    initialize: function (options) {
        App.debug('App.ControlSignOutView.initialize()');
        this.options = options || {}
        _.bindAll(this, 'render');
        this.render();
    },
    render: function () {
        App.debug('App.ControlSignoutView.render()');
        this.$el.html(this.template(this.options.userModel.get('username')));
    },
    signOut: function () {
        App.debug('App.ControlsSignOutView.signOut()');
        this.options.userModel.signOut();
    }
});

App.ControlsSignInView = App.NestedView.extend({
    name:'ControlsSignInView',
    tagName: 'li',
    template: _.template($('#tpl-controls-sign-in-view').html()),
    initialize: function (options) {
        App.debug('App.ControlSignInView.initialize()');
        this.options = options || {}
        _.bindAll(this, 'render');
        this.render();
    },
    render: function () {
        App.debug('App.ControlSignInView.render()');
        this.$el.html(this.template(this.options.userModel.get('username')));
    }
});

App.QueryView = App.NestedView.extend({
    name:'QueryView',
    template: _.template($('#tpl-query-view').html()),
    events: {
        'click a.duplicate': 'onCopyInput',
        'click a.remove': 'onRemoveInput'
    },
    initialize: function (options) {
        App.debug('App.QueryView.initialize()');
        App.debug(options);
        _.bindAll(this, 'onCopyInput');
        _.bindAll(this, 'onRemoveInput');
        _.bindAll(this, 'onNameModalSubmit');
        this.mediaSources = options.mediaSources;
        this.mediaSelectView = new App.MediaSelectView({
            model: this.model.get('params').get('mediaModel')
            , mediaSources: this.mediaSources
        });
        this.mediaListView = new App.MediaListView({
            model: this.model.get('params').get('mediaModel')
        });

        this.dateRangeView = new App.DateRangeView({ model: this.model });
        this.keywordView = new App.KeywordView({model: this.model});
        this.controlsView = new App.QueryControlsView();
        this.model.on('remove', this.close, this);
        this.addSubView(this.mediaSelectView);
        this.addSubView(this.mediaListView);
        this.addSubView(this.dateRangeView);
        this.addSubView(this.controlsView);
        this.render();
    },
    render: function () {
        // Show loading
        this.$el.html(this.template());
        progress = _.template($('#tpl-progress').html());
        this.$('.query-view-content').html(progress());
        var that = this;
        this.mediaSources.deferred.done(function () {
            that.$el.html(that.template());
            // Replace loading with sub views
            that.$('.query-view-content')
                .append(that.keywordView.el)
                .append(that.mediaListView.el)
                .append(that.mediaSelectView.el)
                .append(that.dateRangeView.el);
            that.updateTitle();
            that.listenTo(that.model, 'mm:namechange', that.updateTitle);
            // In order for the modal to show up above all page content
            // it needs to be directly under the body.
            that.nameModal$ = that.$('.mm-edit-query-label');
            $('body').append(that.nameModal$.remove());
            that.nameModal$.on('shown.bs.modal', function () {
                that.nameModal$.find('input').focus();
            });
            that.$('a.edit').on('click', function (event) {
                event.preventDefault();
                that.nameModal$.find('input').val(that.model.get('name'));
                that.nameModal$.modal('show');
            })
            // Listen for submit of label dialog
            that.nameModal$.find('.btn-primary').on('click', that.onNameModalSubmit);
            that.nameModal$.find('input').on('keypress', function (event) {
                if (event.which == 13) {
                    that.onNameModalSubmit();
                }
            });
            that.$('.query-color').css('color', that.model.getColor());
        });
    },
    updateTitle: function () {
        this.$('.query-title').text(this.model.getName());
    },
    onNameModalSubmit: function () {
        this.model.set('name', this.nameModal$.find('input').val());
        this.nameModal$.modal('hide');
    },
    onCopyInput: function (evt) {
        App.debug('App.QueryView.onCopyInput()');
        evt.preventDefault();
        var newMedia = this.model.get('params').get('mediaModel');
        delete newMedia['queryUid'];
        var attr = {
            start: this.model.get('params').get('start'),
            end: this.model.get('params').get('end'),
            keywords: this.model.get('params').get('keywords'),
            mediaModel: newMedia.clone()
        };
        var opts = {
            mediaSources: this.mediaSources
            , parse: true
            , ResultModel: this.model.ResultModel
        };
        var newModel = new App.QueryModel(attr, opts);
        newModel.set('name', "Copy of " + this.model.getName());
        this.model.collection.add(newModel);
    },
    onRemoveInput: function (evt) {
        evt.preventDefault();
        this.model.collection.remove(this.model);
    }
});

App.DemoQueryView = App.NestedView.extend({
    name:'DemoQueryView',
    template: _.template($('#tpl-query-view').html()),
    events: {
        'click button.copy': 'onDemoCopyInput',
        'click button.remove': 'onDemoRemoveInput'
    },
    initialize: function (options) {
        /*
        App.debug('App.DemoQueryView.initialize()');
        App.debug(options);
        _.bindAll(this, 'onDemoCopyInput');
        _.bindAll(this, 'onDemoRemoveInput');
        _.bindAll(this, 'onNameModalSubmit');
        this.mediaSources = options.mediaSources;
        this.dateRangeView = new App.DateRangeView({
            model: this.model, disabled: true
        });
        this.keywordView = new App.KeywordView({ model: this.model});
        this.controlsView = new App.QueryControlsView();
        this.simpleTagSelectView = new App.SimpleTagSelectView({
            model: this.model.get('params').get('mediaModel')
            , mediaSources: this.mediaSources
            , disabled: true
        });
        this.simpleTagListView = new App.SimpleTagListView({
            model: this.model.get('params').get('mediaModel')
            , disabled: true
        });
        this.model.on('remove', this.close, this);
        this.addSubView(this.dateRangeView);
        this.addSubView(this.controlsView);
        this.addSubView(this.simpleTagSelectView);
        this.addSubView(this.simpleTagListView);
        this.render();
        */
    },
    render: function () {
        // Assume the media sources are loaded already
        this.$el.html(this.template());
        // Replace loading with sub views
        var that = this;
        this.mediaSources.deferred.done(function () {
            that.$el.html(that.template());
            // Replace loading with sub views
            var topRow = $('<div>').addClass('row')
                .append(that.keywordView.el)
                .append(that.dateRangeView.el)
                .append(that.controlsView.el);
            var bottomRow = $('<div>').addClass('row')
                .append(that.simpleTagSelectView.el)
                .append(that.simpleTagListView.el);
            that.$('.query-view-content').html('')
                .append(topRow)
                .append(bottomRow);
        });
        // Defer until after this view has been added to the DOM
        _.defer(function () {
            that.updateTitle();
            that.listenTo(that.model, 'mm:namechange', that.updateTitle);
            // In order for the modal to show up above all page content
            // it needs to be directly under the body.
            that.nameModal$ = that.$('.mm-edit-query-label');
             $('body').append(that.nameModal$.remove());
            that.nameModal$.on('shown.bs.modal', function () {
                that.nameModal$.find('input').focus();
            });
            that.$('h3 a').on('click', function (event) {
                event.preventDefault();
                that.nameModal$.find('input').val(that.model.get('name'));
                that.nameModal$.modal('show');
            })
            // Listen for submit of label dialog
            that.nameModal$.find('.btn-primary').on('click', that.onNameModalSubmit);
            that.nameModal$.find('input').on('keypress', function (event) {
                if (event.which == 13) {
                    that.onNameModalSubmit();
                }
            });
        });
    },
    updateTitle: function () {
        this.$('.query-title').text(this.model.getName());
    },
    onNameModalSubmit: function () {
        this.model.set('name', this.nameModal$.find('input').val());
        this.nameModal$.modal('hide');
    },
    onDemoCopyInput: function (evt) {
        App.debug('App.DemoQueryView.onCopyInput()');
        evt.preventDefault();
        var newMedia = this.model.get('params').get('mediaModel').clone();
        var attr = {
            start: this.model.get('params').get('start'),
            end: this.model.get('params').get('end'),
            keywords: this.model.get('params').get('keywords'),
            mediaModel: newMedia
        };
        var opts = {
            mediaSources: this.mediaSources
            , parse: true
            , ResultModel: this.model.ResultModel
        };
        var newModel = new App.QueryModel(attr, opts);
        this.model.collection.add(newModel);
    },
    onDemoRemoveInput: function (evt) {
        evt.preventDefault();
        this.model.collection.remove(this.model);
    }
});

App.QueryListView = App.NestedView.extend({
    name:'QueryListView',
    id:'query-builder',
    template: _.template($('#tpl-query-list-view').html()),
    refTemplate: _.template($('#tpl-query-list-view-reference').html()),
    events: {
        "click .btn-primary": 'onQuery',
        "click .query-pager.left": 'onPagerLeft',
        "click .query-pager.right": 'onPagerRight'
    },
    initialize: function (options) {
        App.debug('App.QueryListView.initialize()');
        _.bindAll(this, 'onAdd');
        this.mediaSources = options.mediaSources;
        this.collection.on('add', this.onAdd, this);
        this.collection.on('remove', this.onRemove, this);
        this.render();
    },
    render: function () {
        // Show loading
        this.$el.html(this.template());
        $('.reference .query-list').remove();
        $('.reference').append(this.refTemplate());
        progress = _.template($('#tpl-progress').html());
        this.$('.container-fluid .query-list-view-content').html(progress());
        var that = this;
        this.mediaSources.deferred.done(function () {
            that.$el.html(that.template());
            // Replace loading with queries
            that.collection.each(function (m) {
                that.onAdd(m, that.collection)
            });
            _.defer(function () { that.initializeCarousel(); });
        });
    },
    onQuery: function (ev) {
        ev.preventDefault();
        this.collection.execute();
    },
    onAdd: function (model, collection, options) {
        App.debug('App.QueryListView.onAdd()');
        var queryView = new App.QueryView({
            model: model,
            mediaSources: this.mediaSources
        });
        this.addSubView(queryView);
        this.$('.query-carousel').append(queryView.$el);
        // TODO this is a hack to only allow two queries, but we can get data
        // for more once the viz can handle it.
        this.updateNumQueries(collection);
        this.updateCarousel(0);
    },
    onRemove: function (model, collection, options) {
        this.updateNumQueries(collection);
        this.updateCarousel(0);
    },
    updateNumQueries: function (collection) {
        var that = this;
        // Query views may not be rendered yet, so defer
        _.defer(function () {
            if (collection.length == 1) {
                that.$('.query-views').addClass('one');
                that.$('.query-views').removeClass('two');
            } else {
                that.$('.query-views').addClass('two');
                that.$('.query-views').removeClass('one');
            }
            that.$('.query-views h3').eq(0).addClass('first-query');
            that.$('.query-views h3').eq(1)
                .removeClass('first-query')
                .addClass('second-query');
        });
    },
    initializeCarousel: function () {
        this.queryIndex = 0;
        this.queryWidth = $('.reference .query-view').width();
        this.carouselWidth = $('.query-views .query-carousel-window').width();
        this.carouselPad = 2 * parseInt($('.query-carousel-window').css('padding-left')) + 2;
        this.onCarouselUpdated();
    },
    onCarouselUpdated: function () {
        App.debug("QueryListView.onCarouselUpdated()");
        var queries = this.$('.query-view');
        var queryPad = 2 * parseInt($('.reference .query-view').css('padding-left'));
        toShow = Math.floor(this.carouselWidth / (this.queryWidth + queryPad));
        $('.query-carousel-window')
            .css('width', (toShow * (this.queryWidth + queryPad) + this.carouselPad) + 'px')
            .css('float', 'left')
            .css('left', Math.round((this.carouselWidth % (this.queryWidth + queryPad)) / 2) + 'px');
        $('.query-pager.left')
            .css('left', Math.round((this.carouselWidth % (this.queryWidth + queryPad)) / 2) + 'px');
        $('.query-pager.right')
            .css('left', '-' + Math.round((this.carouselWidth % (this.queryWidth + queryPad)) / 2) + 'px');
        $('.query-views .query-view').width(this.queryWidth + 'px');    
        var queries = $('.query-views .query-view');
        for (var i = 0; i < this.queryIndex; i++) {
            $(queries.get(i)).removeClass('visible')
        }
        for (i = this.queryIndex; i < Math.min(this.queryIndex + toShow, this.collection.length); i++) {
            $(queries.get(i)).addClass('visible');
        }
        for (i = this.queryIndex + toShow; i < this.collection.length; i++) {
            $(queries.get(i)).removeClass('visible');
        }
        if (this.queryIndex > 0) {
            this.$('.query-pager.left button').removeAttr('disabled');
        } else {
            this.$('.query-pager.left button').attr('disabled', 'disabled');
        }
        if (this.queryIndex + toShow < this.collection.length) {
            this.$('.query-pager.right button').removeAttr('disabled');
        } else {
            this.$('.query-pager.right button').attr('disabled', 'disabled');
        }
    },
    updateCarousel: function (change) {
        var that = this;
        var queries = this.$('.query-views .query-view');
        var visQueries = queries.filter(":visible");
        var width = visQueries.width();
        var margin = parseInt(visQueries.css('padding-left')) * 2;
        var queryPad = 2 * parseInt($('.reference .query-view').css('padding-left'));
        toShow = Math.floor(this.carouselWidth / (this.queryWidth + queryPad));
        if (typeof(change) != "undefined" && change > 0 && this.queryIndex < queries.length - toShow) {
            var rightIndex = this.queryIndex + toShow;
            $('.query-carousel-window').css('overflow', 'hidden');
            $(queries[rightIndex])
                .css('margin-right', '-100%')
                .addClass('visible');
            $('.query-views .query-carousel').animate({
                'left': "-" + (width + margin) + "px"
            }, 250, null, function () {
                $('.query-carousel-window').css('overflow', 'visible');
                $(queries[rightIndex]).css('margin-right', '0');
                that.queryIndex += change;
                that.queryIndex = Math.min(that.queryIndex, queries.length - toShow);
                that.queryIndex = Math.max(that.queryIndex, 0);
                $('.query-carousel').css('left', '0');
                that.onCarouselUpdated();
            });
        } else if (typeof(change) != "undefined" && change < 0 && this.queryIndex > 0) {
            var rightIndex = this.queryIndex + toShow - 1;
            var leftIndex = this.queryIndex - 1;
            $('.query-carousel-window').css('overflow', 'hidden');
            $(queries[rightIndex])
                .css('margin-right', '-100%');
            $(queries[leftIndex])
                .addClass('visible');
            $('.query-carousel').css('left', "-" + (width + margin) + "px");
            $('.query-views .query-carousel').animate({
                'left': "0"
            }, 250, null, function () {
                $('.query-carousel-window').css('overflow', 'visible');
                $(queries[rightIndex]).css('margin-right', '0');
                that.queryIndex += change;
                that.queryIndex = Math.max(that.queryIndex, 0);
                that.queryIndex = Math.min(that.queryIndex, toShow);
                that.onCarouselUpdated();
            });
        } else {
            that.onCarouselUpdated();
        }
    },
    onPagerLeft: function () {
        this.updateCarousel(-1);
    },
    onPagerRight: function () {
        this.updateCarousel(1);
    }
});

App.DemoQueryListView = App.QueryListView.extend({
    name: 'DemoQueryListView',
    render: function () {
        // Assume media sources is already loaded
        this.$el.html(this.template());
        // Replace loading with queries
        var that = this;
        this.$('.messages').append($('<p>This public demo is a limited-functionality version of the full Media Meter Dashboard.<br/>Go to <a href="http://mediacloud.org/get-involved">mediacloud.org/get-involved</a> to learn how to sign up for an account to allow full searches.</p>'));
        this.collection.each(function (m) {
            that.onAdd(m, that.collection)
        });
    },
    onAdd: function (model, collection, options) {
        App.debug('DemoApp.QueryListView.onAdd()');
        var queryView = new App.DemoQueryView({
            model: model
            , mediaSources: this.mediaSources
        });
        this.addSubView(queryView);
        this.$('.query-views').append(queryView.$el);
        // TODO this is a hack to only allow two queries, but we can get data
        // for more once the viz can handle it.
        if (collection.length == 1) {
            this.$('.query-views').addClass('one');
            this.$('.query-views').removeClass('two');
        } else {
            this.$('.query-views').addClass('two');
            this.$('.query-views').removeClass('one');
        }
        this.$('.query-views .query-title').eq(0).addClass('first-query');
        this.$('.query-views .query-title').eq(1)
            .html('Comparison Query')
            .addClass('second-query');
    }
});

App.SimpleTagListView = App.NestedView.extend({
    name:'SimpleTagListView',
    template: _.template($('#tpl-simple-tag-list-view').html()),
    initialize: function (options) {
        App.debug('App.SimpleTagListView.initialize()');
        _.bindAll(this, 'onAdd');
        _.bindAll(this, 'onRemoveClick');
        this.disabled = options.disabled;
        this.render();
        // Add listeners
        this.model.get('tags').on('add', this.onAdd, this);
        // Set listener context
    },
    render: function () {
        App.debug('App.SimpleTagListView.render()');
        var that = this;
        this.$el.html(this.template());
        if (this.disabled) {
            this.$el.addClass('disabled');
        }
        this.model.get('tags').each(function (m) {
            that.onAdd(m, that.model.get('tags'), {});
        });
    },
    onAdd: function (model, collection, options) {
        App.debug('App.SimpleTagListView.onAdd()');
        App.debug(model);
        var itemView = new App.ItemView({
            model: model
            , display: function (m) { return m.get('tag_set_label') + ': ' + m.get('label'); }
        });
        itemView.on('removeClick', this.onRemoveClick);
        this.$('.simple-tag-list-view-content').append(itemView.el);
    },
    onRemoveClick: function (model) {
        App.debug('App.SimpleTagListView.onRemoveClick()');
        this.model.get('tags').remove(model);
    }
});

App.MediaSelectView = App.NestedView.extend({
    name: 'MediaSelectView',
    template: _.template($('#tpl-media-select-view').html()),
    events: {
        'click .add': 'onTextEntered'
        , 'click .explore': 'onExplore'
        , 'click .add-more a': 'onAddMore'
    },
    initialize: function (options) {
        App.debug('App.MediaSelectView.initialize()');
        App.debug(options);
        this.mediaSources = options.mediaSources;
        this.disabled = options.disabled;
        this.listenTo(this.model.get('sources'), 'all', this.updateVisibility);
        this.listenTo(this.model.get('tags'), 'all', this.updateVisibility);
        // Set deferred callbacks
        var that = this;
        _.bindAll(this, 'onTextEntered');
        _.bindAll(this, 'onExplore');
        that.render();
        if (!that.disabled) {
            App.debug('Creating typeahead');
            that.$('.media-input input').typeahead(null, {
                name: 'Sources',
                displayKey: 'name',
                source: that.mediaSources.get('sources').getRemoteSuggestionEngine().ttAdapter(),
            }, {
                name: 'Tags',
                displayKey: function (d) { return d.tag_set_label + ': ' + d.label; },
                source: that.mediaSources.get('tags').getRemoteSuggestionEngine().ttAdapter()
            });
            // Listen to custom typeahead events
            that.$('.media-input').bind(
                'typeahead:selected',
                function (event, suggestion) { that.onTextEntered(event, suggestion); });
        }
    },
    updateVisibility: function () {
        App.debug('App.MediaSelectView.updateVisibility()')
        if (this.model.get('tags').length == 0 && this.model.get('sources').length == 0) {
            this.$('.add-more a').text("select media");
        } else {
            this.$('.add-more a').text("add media");
        }
        this.$('.add-more').css('display', 'none');
        this.$('.media-input').css('display', 'none');
        if (this.isOpen) {
            this.$('.media-input').css('display', 'block');
        } else {
            this.$('.add-more').css('display', 'block');
        }
    },
    render: function () {
        App.debug('App.MediaSelectView.render()');
        this.$el.html(this.template());
        this.updateVisibility();
        if (this.disabled) {
            this.$('.media-input').attr('disabled', 'disabled');
            this.$('button').attr('disabled', 'disabled');
        }
    },
    onTextEntered: function (event, suggestion) {
        App.debug('App.MediaSelectView.textEntered()');
        var that = this;
        if (event) { event.preventDefault(); }
        $('.media-input .tt-input', this.$el).typeahead('val', '');
        var $el = this.$el;
        if (suggestion.tags_id) {
            that.model.get('tags').add(suggestion);
        } else {
            that.model.get('sources').add(suggestion);
        }
    },
    onExplore: function (event) {
        App.debug('App.MediaSelectView.onExplore()');
        event.preventDefault();
        var that = this;
        App.con.mediaExplorer.show();
        $.when(
            this.mediaSources.get('sources').fetch(),
            this.mediaSources.get('tag_sets').fetch()
        ).done(function () {
        });
    },
    onAddMore: function (event) {
        var that = this;
        event.preventDefault();
        this.$('.add-more').hide();
        this.$('.media-input').show();
        _.defer(function () {
            that.$('.media-input .tt-input').focus();
        });
    }
});

// Displays a single source
App.SourceExploreView = Backbone.View.extend({
    name: 'SourceExploreView',
    initialize: function (options) {
        this.render();
    },
    render: function () {
        var tpl = _.template($('#tpl-source-explore-view').html(), this.model.toJSON());
        this.$el.html(tpl);
    }
});

// Displays a single tag set
App.TagSetExploreView = Backbone.View.extend({
    name:'TagSetExploreView',
    initialize: function (options) {
        this.render();
    },
    render: function () {
        var that = this;
        var tpl = _.template($('#tpl-tag-set-explore-view').html(), this.model.toJSON());
        this.$el.html(tpl);
        this.model.get('tags').each(function (m) {
            that.$('ul.tags').append($('<li>').html(m.getLabel()));
        });
    }
});

App.ItemView = Backbone.View.extend({
    name:'ItemView',
    tagName: 'li',
    events: {
        'click .remove': 'onClickRemove'
    },
    initialize: function (options) {
        this.display = options.display;
        this.render();
        _.bindAll(this, 'onClickRemove');
    },
    render: function () {
        this.$el.addClass('list-group-item');
        var data = {}
        if (this.display && typeof(this.display) === 'function') {
            data.name = this.display(this.model);
        } else if (this.dispaly) {
            data.name = this.model.get(this.display);
        } else {
            data.name = this.model.get('name');
        }
        this.template = _.template($('#tpl-item-view').html(), data);
        this.$el.html(this.template);
    },
    onClickRemove: function (event) {
        event.preventDefault();
        this.trigger('removeClick', this.model);
        this.remove();
    }
});

App.MediaListView = App.NestedView.extend({
    name:'MediaListView',
    template: _.template($('#tpl-media-list-view').html()),
    initialize: function (options) {
        App.debug('App.MediaListView.initialize()');
        _.bindAll(this, 'onAdd');
        _.bindAll(this, 'onRemoveClick');
        this.disabled = options.disabled;
        this.render();
        // Add listeners
        this.model.get('sources').on('add', this.onAdd, this);
        this.model.get('tags').on('add', this.onAddTag, this);
        // Set listener context
    },
    render: function () {
        App.debug('App.MediaListView.render()');
        var that = this;
        this.$el.html(this.template());
        if (this.disabled) {
            this.$el.addClass('disabled');
        }
        this.model.get('sources').each(function (m) {
            that.onAdd(m, that.model.get('sources'), {});
        });
        this.model.get('tags').each(function (m) {
            that.onAddTag(m, that.model.get('tags'), {});
        });
        this.listenTo(this.model.get('sources'), 'all', this.onChange);
        this.listenTo(this.model.get('tags'), 'all', this.onChange);
        this.onChange();
    },
    onAdd: function (model, collection, options) {
        App.debug('App.MediaListView.onAdd()');
        var itemView = new App.ItemView({
            model: model,
            display: function (model) {
                if (model.get("name")) {
                    return model.get("name");
                } else {
                    return model.tag_set_label + ': ' + model.label;
                }
            }
        });
        itemView.on('removeClick', this.onRemoveClick);
        this.$('.media-list-view-content').append(itemView.el);
    },
    onAddTag: function (model, collection, options) {
        App.debug('App.MediaListView.onAdd()');
        var itemView = new App.ItemView({
            model: model
            , display: function (m) { return m.get('tag_set_label') + ': ' + m.get('label'); }
        });
        itemView.on('removeClick', this.onRemoveClick);
        this.$('.media-list-view-content').append(itemView.el);
    },
    onRemoveClick: function (model) {
        App.debug('App.MediaListView.onRemoveClick()');
        // Figure out which collection to remove from,
        // otherwise we might remove the wrong thing.
        // The model can only be in one of the following,
        // no harm in removing from both.
        this.model.get('sources').remove(model);
        this.model.get('tags').remove(model);
    },
    onChange: function () {
        if (this.model.get('sources').length == 0 && this.model.get('tags').length == 0) {
            this.$('.all-media').show();
            this.$('.media-list-view-content').hide();
        } else {
            this.$('.all-media').hide();
            this.$('.media-list-view-content').show();
        }
    }
});

App.DateRangeView = Backbone.View.extend({
    name: 'DateRangeView',
    template: _.template($('#tpl-date-range-view').html()),
    events: {
        "change input": "onContentChange"
    },
    initialize: function (options) {
        App.debug('App.DateRangeView.initialize()');
        App.debug(options);
        _.bindAll(this, "onContentChange");
        this.disabled = options.disabled;
        this.render();
    },
    render: function () {
        App.debug('App.DateRangeView.render()');
        var that = this;
        this.$el.html(this.template())
        this.$('.date-range-start').val(this.model.get('params').get('start'));
        this.$('.date-range-end').val(this.model.get('params').get('end'));
        // Create the datepickers and hide on selection / tab-out
        if (!this.disabled) {
            var start = this.$('.date-range-start').datepicker(
                App.config.datepickerOptions
            ).on('changeDate', function (event) {
                that.onContentChange();
                start.hide();
            }).on('keydown', function (event) {
                if (event.keyCode == 9) {
                    start.hide();
                }
            }).data('datepicker');
            var end = this.$('.date-range-end').datepicker(
                App.config.datepickerOptions
            ).on('changeDate', function (event) {
                that.onContentChange();
                end.hide();
            }).on('keydown', function (event) {
                if (event.keyCode == 9) {
                    end.hide();
                }
            }).data('datepicker');
        } else {
            this.$('.date-range-start').attr('disabled', 'disabled');
            this.$('.date-range-end').attr('disabled', 'disabled');
        }
    },
    onContentChange: function () {
        App.debug('App.DateRangeView.onContentChange()');
        this.model.get('params').set('start', this.$('.date-range-start').val());
        this.model.get('params').set('end', this.$('.date-range-end').val());
    }
});

App.KeywordView = Backbone.View.extend({
    name: 'KeywordView',
    template: _.template($('#tpl-keyword-view').html()),
    events: {
        "change input": "contentChanged"
    },
    initialize: function (options) {
        App.debug('App.KeywordView.initialize()');
        App.debug(options);
        _.bindAll(this, 'contentChanged');
        this.listenTo(this.model.get('params'), 'change', this.modelChanged);
        this.render();
    },
    render: function () {
        var that = this;
        this.$el.html(this.template());
        // Use default from template if there are no keywords
        this.$input = this.$('textarea');
        if (this.model.get('params').get('keywords')) {
            this.$input.val(this.model.get('params').get('keywords'));
        }
        var $el = this.$el;
        _.defer(function () {
            $('.keyword-view-keywords', $el).focus();
        });
        var that = this;
    },
    contentChanged: function () {
        this.model.get('params').set('keywords', this.$input.val());
    },
    modelChanged: function () {
        this.$input.val(this.model.get('params').get('keywords'));
    }
});

App.QueryControlsView = App.NestedView.extend({
    template: _.template($('#tpl-query-controls-view').html()),
    initialize: function (options) {
        this.render();
    },
    render: function () {
        this.$el.html(this.template());
    }
});

// Displays explorers for sources and tags
App.MediaExploreView = Backbone.View.extend({
    name: 'MediaExploreView',
    template: _.template($('#tpl-media-explore-view').html()),
    initialize: function (options) {
        App.debug('App.MediaExploreView.initialize()');
        this.mediaSources = options.mediaSources;
        this.sourceListView = new App.ExploreListView({
            collection: this.mediaSources.get('sources')
            , ExploreView: App.SourceExploreView
            , page: true
            , cssId: "media-explore-sources"
        });
        this.tagListView = new App.ExploreListView({
            collection: this.mediaSources.get('tag_sets')
            , ExploreView: App.TagSetExploreView
            , cssId: "media-explore-tags"
        });
        this.render();
    },
    render: function () {
        App.debug('App.MediaExploreView.render()');
        $('body').append(this.el);
        this.$el.html(this.template());
        this.sourceListView.$el.addClass("active");
        this.$('.tab-content')
            .append(this.sourceListView.el)
            .append(this.tagListView.el);
        this.sourceListView.$('.explore-list-view-content').html(_.template($('#tpl-progress').html())());
    },
    show: function () {
        App.debug('App.MediaExploreView.show()');
        var that = this;
        this.$('.modal').modal('show');
        $.when(
            this.mediaSources.get('sources').fetch()
            , this.mediaSources.get('tag_sets').fetch()
        ).then(function () {
            that.sourceListView.showPage("A");
            that.tagListView.showAll();
        });
    }
});

// Display a collection of media sources or tag sets
App.ExploreListView = Backbone.View.extend({
    name: 'ExploreListView',
    template: _.template($('#tpl-explore-list-view').html()),
    initialize: function (options) {
        App.debug('App.ExploreListView.initialize()');
        this.ExploreView = options.ExploreView
        this.page = options.page;
        this.cssId = options.cssId;
        var that = this;
        this.render();
    },
    render: function () {
        App.debug('App.ExploreListView.render()');
        var that = this;
        this.$el.addClass("tab-pane").attr("role", "tabpanel").attr("id", this.cssId);
        this.$el.html(this.template());
        if (this.page) {
            var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            _.each(alpha, function (a) {
                var link = $('<a href="">' + a + '</a>');
                that.$('.alpha-links').append(
                    $('<li>')
                        .append(link)
                );
                link.bind('click', function (event) {
                    event.preventDefault();
                    that.showPage(a);
                });
            });
        } else {
            this.$('.explore-list-view-content').html(_.template($('#tpl-progress').html())());
            this.$('.explore-list-view-content').addClass('no-page');
        }
    },
    onAdd: function (m) {
        var v = new this.ExploreView({
            model: m
        });
        this.$('.explore-list-view-content').append(v.el);
    },
    showAll: function () {
        App.debug('App.ExploreListView.showAll()');
        var that = this;
        this.$('.explore-list-view-content').html('');
        this.collection.each(function (m) {
            that.onAdd(m);
        });
    },
    showPage: function (a) {
        App.debug('App.ExploreListView.showPage()');
        var that = this;
        if (typeof(a) === 'undefined') {
            a = 'A';
        }
        if (this.currentPage != a) {
            this.$('.explore-list-view-content').html(_.template($('#tpl-progress').html())());
            // Show the progress bar before we start building results
            _.defer(function () {
                that.$('.explore-list-view-content').html('');
                that.currentPage = a;
                var f = function(d) { return d.get('name')[0].toUpperCase() == a; }
                _.each(that.collection.filter(f), function (m) {
                    that.onAdd(m);
                });
            });
        }
    }
});

App.QueryResultView = App.NestedView.extend({
    name: 'QueryResultView',
    tagName: 'div',
    id: 'query-results',
    initialize: function (options) {
        App.debug('App.QueryResultView.initialize():' + this.cid);
        this.subViews = options['subViews'];
        for(idx in this.subViews){
            this.addSubView(subViews[inx]);
        }
        this.render();
    },
    render: function () {
        // Reset and render views
        this.$el.html('');
        for(idx in this.subViews){
            this.$el.append(subViews[idx].$el);
        }
    }
});

App.ToolListView = Backbone.View.extend({
    tagName: 'ul',
    initialize: function (options) {
        _.bindAll(this, 'render');
        this.render();
        this.listenTo(this.collection, 'execute', this.render);
    },
    render: function () {
        App.debug('App.ToolListView.render()');
        var path = '#' + this.collection.dashboardUrl();
        this.$el.html('');
        this.$el.append(
            $('<li class="dashboard-color">').append(
                $('<a>')
                    .attr('href', 'https://dashboard.mediameter.org/' + path)
                    .text('Dashboard')
                )
            );
/*        this.$el.append(
            $('<li class="mentions-color">').append(
                $('<a>')
                    .attr('href', 'https://mentions.mediameter.org/' + path)
                    .text('Mentions')
                )
            );
        this.$el.append(
            $('<li class="frequency-color">').append(
                $('<a>')
                    .attr('href', 'https://frequency.mediameter.org/' + path)
                    .text('Frequency')
                )
            );*/
    }
});

// This simple helpers centralize adding download links to the action menu.  Use it as a mixin to any view that has
// and action menu.
App.ActionedViewMixin = {
    _downloadUrlTemplate: _.template('<li class="action-download"><a class="<%=cssClass%> role="presentation" role="menuitem" href="<%=url%>"><%=text%></a></li>'),
    hideActionMenu: function(){
        this.$('.panel-heading button').hide();
    },
    showActionMenu: function(){
        this.$('.panel-heading button').show();
    },
    addDownloadMenuItems: function(downloadInfo,title,cssClass){
        if(App.con.userModel.get('authenticated')==false){ // public users can't download
            return;
        }
        this.$('.panel-action-list li.action-download').remove();
        for(idx in downloadInfo){
            var text = "";
            if(typeof title === "undefined"){
                name = '<span class="">'+downloadInfo[idx].name+'</span>';
                text = "Download "+name+" Data CSV";
            } else {
                text = title;
            }
            var element = this._downloadUrlTemplate({url:downloadInfo[idx].url,'text':text,'cssClass':cssClass});
            this.$('.panel-action-list').append(element);  
        }
    }
};

App.AboutView = Backbone.View.extend({
    name: 'AboutView',
    initialize: function(options){
        this.options = options;
        this.template = _.template($(this.options['template']).html());
        this.render();
    },
    render: function(){
        this.$el.html(this.template());
        this.$('.modal').modal('show');
    }
});

// Single word cloud view
App.WordCountResultView = Backbone.View.extend({
    name: 'WordCountResultView',
    config: {
        minSize: 8,
        maxSize: 48,
        linkColor: "#428bca"
    },
    template: _.template($('#tpl-wordcount-result-view').html()),

    initialize: function (options) {
        if('clickable' in options){
            this.clickable = options['clickable'];
        } else {
            this.clickable = true;
        }
        this.render();
    },

    render: function () {
        App.debug('App.WordCountResultView.render()');
        var wordcounts = this.collection;
        this.$el.html(this.template());
        var that = this;
        // wait until end to get correct width
        _.defer(function(){that.renderD3(wordcounts);});
    },

    renderD3: function (wordcounts) {
        App.debug('App.WordCountResultView.renderD3()');
        var that = this;
        this.$('.wordcount-result-view-content')
            .html('')
            .css('padding', '0');
        var width = this.$('.wordcount-result-view-content').width();
        var height = 400;
        var topWords = _.first(wordcounts.toJSON(), 100);
        var counts = _.pluck(topWords, 'count');
        var min = d3.min(counts);
        var max = d3.max(counts);
        var slope = this.config.maxSize / Math.log(max);
        // get list of all words and sizes
        wordList = [];
        _.each(topWords, function (m) {
                wordList.push({text: m['term'], size: slope * Math.log(m['count'])});
            }
        );
        // create wordcloud
        d3.layout.cloud().size([width, height])
        .words(wordList)
        .rotate(function() { return ~~(Math.random() * 1) * 90; })
        .font("Arial")
        .fontSize(function(d) { return d.size; })
        .on("end", function (words) {
            // Black and white
            // var fill = d3.scale.linear().domain([0,100]).range(["black","white"]);
            // Colors
            var fill = d3.scale.category20();
            var svg = d3.select(that.$('.wordcount-result-view-content')[0]).append('svg')
            .attr('width', width).attr('height', height)    
            .append("g")
            .attr("transform", "translate("+width/2+","+height/2+")")
            .selectAll("text")
            .data(words)
            .enter().append("text")
            .attr("font-size", function(d) { return d.size + "px"; })
            .attr("fill", App.config.queryColors[0])
            .attr("text-anchor", "middle")
            .attr('font-weight', 'bold')
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .text(function(d) { return d.text; });
        })
        .start();
        if(that.clickable==true) {
            d3.select(that.$('.wordcount-result-view-content')[0]).selectAll('text')
                .on('mouseover', function () {
                    d3.select(this).attr('fill', that.config.linkColor)
                    .attr('cursor','pointer');
                })
                .on('mouseout', function () {
                    color = App.config.queryColors[0];
                    d3.select(this).attr('fill', color)
                    .attr('cursor','default');
                })
                .on('click', function (d) {
                    that.trigger('mm:refine', {
                        term: d.text
                    });
                });
        }
    }
});

