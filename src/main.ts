import { Platform, HereMapController } from './heremaps';
import { map } from '@reactivex/rxjs/dist/package/operators/map';
import { last } from '@reactivex/rxjs/dist/package/operator/last';




const platform = new Platform({ 'app_id': 'MfQ6bvG6FYp0SU0X6WLw', 'app_code': '3MepP4cz3_5ezmYkUWvLdQ' });

let layers = platform.createDefaultLayers();

const mapController = new HereMapController('map', platform, layers, layers.normal.map);

mapController.loaded.subscribe(
    {
        next: (v) => {
            if (v) {
                console.log('map loaded');
                // mapController.map.setBaseLayer(layers.satellite.map);
               
                // mapController.search('1400 Tether drive');
            } else {
                console.log('map not loaded yet');
            }
        }
    });



    let waypoints: string[] = [];
    waypoints.push('geo!52.5,13.4');
    waypoints.push('geo!52.5,13.45');
    mapController.route(waypoints, 'routeResults', null);



