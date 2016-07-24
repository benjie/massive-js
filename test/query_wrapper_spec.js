var assert = require("assert");
var helpers = require("./helpers");
var db;

describe('connectionWrapper', function () {
  before(function(done){
    helpers.resetDb(function(err,res){
      db = res;
      done();
    });
  });

  describe.only('row level security', function() {

    function connectionWrapperForUserId(userId) {
      return function (db, next, done) {
        db.run('begin; set local role users; set local claims.user_id to ?; select 1/0;', [userId], function(err) {
          next(err, db, function (err) {
            var args = Array.prototype.slice.call(arguments);
            db.run(err ? 'rollback;' : 'commit;', function(err2) {
              args[0] = args[0] || err2;
              done.apply(null, args);
            });
          });
        });
      };
    }

    describe('add record - without connectionWrapper', function() {
      it('adds a product ', function (done) {
        db.products_with_rls.save({name : "Gibson Les Paul", description : "Lester's brain child", price : 3500}, function(err, res){
          assert.ifError(err);
          assert.equal(res.id, 1);
          done();
        });
      });
    });

    describe('add record - with connection wrapper and allowed details', function() {
      it('adds a product ', function (done) {
        db.withConnectionWrapper(connectionWrapperForUserId(1)).products_with_rls.save({name : "Gibson Les Paul", description : "Lester's brain child", price : 3500}, function(err, res){
          assert.ifError(err);
          assert.equal(res.id, 2);
          done();
        });
      });
    });

    describe('add record DENIED - with connection wrapper and forbidden details', function() {
      it('adds a product ', function (done) {
        db.withConnectionWrapper(connectionWrapperForUserId(2)).products_with_rls.save({name : "Gibson Les Paul", description : "Lester's brain child", price : 3500}, function(err, res){
          assert.ok(err);
          done();
        });
      });
    });
  });
});
