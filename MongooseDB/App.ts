import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import { TripModel } from './model/TripModel';
import { StopModel } from './model/StopModel';
import * as crypto from 'crypto';
import * as passport from 'passport';
import GooglePassport from './GooglePassport';
import * as session from 'express-session';
import * as cookieParser from 'cookie-parser';

// Creates and configures an ExpressJS web server.
class App {

  // ref to Express instance
  public expressApp: express.Application;
  public Trips: TripModel;
  public Stops: StopModel;
  public googlePassportObj: GooglePassport;

  //Run configuration methods on the Express instance.
  constructor() {
    this.googlePassportObj = new GooglePassport();
    this.expressApp = express();
    this.middleware();
    this.routes();
    this.Trips = new TripModel();
    this.Stops = new StopModel();
  }

  // Configure Express middleware.
  private middleware(): void {
    this.expressApp.use(logger('dev'));
    this.expressApp.use(bodyParser.json());
    this.expressApp.use(bodyParser.urlencoded({ extended: false }));
    this.expressApp.use(session({ secret: 'honse' }));
    this.expressApp.use(cookieParser());
    this.expressApp.use(passport.initialize());
    this.expressApp.use(passport.session());
  }

  private validateAuth(req, res, next): void {
    if (req.isAuthenticated()) { console.log("user is authenticated"); return next(); }
    console.log("user is not authenticated");
    res.redirect('/');
  }

  // Configure API endpoints.
  private routes(): void {
    let router = express.Router();

    router.get('/auth/google',
      passport.authenticate('google',
        { scope: ['https://www.googleapis.com/auth/plus.login', 'email'] }
      )
    );

    router.get('/auth/google/callback',
      passport.authenticate('google',
        { failureRedirect: '/', successRedirect: '/#/trip' }
      )
    );

    router.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

    this.expressApp.use('/', router);
    this.expressApp.use('/json', express.static(__dirname + '/json'));


    router.get('/app/trip/:tripId/count', this.validateAuth, (req, res) => {
      var id = req.params.tripId;
      console.log('Query single trip with id: ' + id);
      this.Stops.retrieveStopsCount(res, { tripId: id });
    });

    router.post('/app/trip/', this.validateAuth, (req, res) => {
      console.log(req.body);
      var jsonObj = req.body;
      this.Trips.model.create([jsonObj], (err) => {
        if (err) {
          console.log('object creation failed' + err);
        }
      });
      res.send('{"id":"' + req.body['tripId'] + '"}');
    });

    router.get('/app/trip/:tripId', this.validateAuth, (req, res) => {
      var id = req.params.tripId;
      console.log('Query single trip with id: ' + id);
      this.Trips.retrieveTripDetails(res, { tripId: id });
    });

    router.get('/app/trip/:tripId/stop', this.validateAuth, (req, res) => {
      var id = req.params.tripId;
      console.log('Query stops in single trip with trip id: ' + id);
      this.Stops.retrieveStopsDetails(res, { tripId: id });
    });

    router.get('/app/trip/', this.validateAuth, (req:any, res) => {
      console.log('Query All trip');
      console.log("userId hello: " + req.user.id);
      this.Trips.retrieveAllTrips(res, {userId: req.user.id});
    });

    router.get('/app/tripcount', this.validateAuth, (req, res) => {
      console.log('Query the number of trip elements in db');
      this.Trips.retrieveTripCount(res);
    });

    router.get('/app/trip/:tripId/stop/:stopId', this.validateAuth, (req, res) => {
      var tripId = req.params.tripId;
      var stopId = req.params.stopId;
      this.Stops.retrieveStopDetail(res, { tripId: tripId, 'stops.stopId': stopId }, stopId);
      console.log('Querying trip: ' + tripId + ' and stop: ' + stopId)
    });

    router.delete('/app/trip/delete/:tripId', this.validateAuth, (req, res) => {
      var tripId = req.params.tripId;
      this.Trips.deleteTrip(res, { tripId: tripId });
      console.log('Deleting trip with tripId: ' + tripId);
    });

    router.get('/app/user/name', this.validateAuth, (req:any, res) => {
      res.json({username: req.user.displayName});
    });

    //Test Routes 

    router.post('/app/test/trip/', (req, res) => {
      console.log(req.body);
      var jsonObj = req.body;
      this.Trips.model.create([jsonObj], (err) => {
        if (err) {
          console.log('object creation failed' + err);
        }
      });
      res.send('{"id":"' + req.body['tripId'] + '"}');
    });

    router.get('/app/test/trip/', (req:any, res) => {
      console.log('Query All trip');
      this.Trips.retrieveAllTrips(res, {});
    });

    router.get('/app/test/trip/:tripId', (req, res) => {
      var id = req.params.tripId;
      console.log('Query single trip with id: ' + id);
      this.Trips.retrieveTripDetails(res, { tripId: id });
    });

    router.get('/app/test/trip/:tripId/stop/:stopId', (req, res) => {
      var tripId = req.params.tripId;
      var stopId = req.params.stopId;
      this.Stops.retrieveStopDetail(res, { tripId: tripId, 'stops.stopId': stopId }, stopId);
      console.log('Querying trip: ' + tripId + ' and stop: ' + stopId)
    });

    router.delete('/app/test/trip/delete/:tripId', (req, res) => {
      var tripId = req.params.tripId;
      this.Trips.deleteTrip(res, { tripId: tripId });
      console.log('Deleting trip with tripId: ' + tripId);
    });

    this.expressApp.use('/', router);

    this.expressApp.use('/app/json/', express.static(__dirname + '/app/json'));
    this.expressApp.use('/images', express.static(__dirname + '/img'));
    this.expressApp.use('/', express.static(__dirname + '/dist/road-trip'));

  }

}

export { App };