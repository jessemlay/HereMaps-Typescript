import * as Rx from 'rxjs/BehaviorSubject';
import * as moment from 'moment';

declare let platform: H.service.Platform;
export class Platform extends H.service.Platform {

    constructor(options: H.service.Platform.Options) {
        super(options);
    }
}


export class HereMapController {
    map: H.Map;
    behavior: H.mapevents.Behavior;
    ui: H.ui.UI;
    platform: H.service.Platform;
    loaded: Rx.BehaviorSubject<boolean> = new Rx.BehaviorSubject<boolean>(false);
    routeInstructionsContainer: HTMLElement;

    constructor(mapId: string, platform: H.service.Platform, defaultLayers: H.service.DefaultLayers, mapLayer: H.map.layer.Layer, mapOptions?: H.Map.Options) {
        this.platform = platform;
        if (navigator.geolocation)
            navigator.geolocation.getCurrentPosition(position => {
                this.map = new H.Map(document.getElementById(mapId), mapLayer, { center: { lat: position.coords.latitude, lng: position.coords.longitude }, zoom: 12 });
                this.behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
                this.ui = H.ui.UI.createDefault(this.map, defaultLayers);
                this.map.addEventListener('mapviewchangeend', (evt) => { this.loaded.next(true); });
                this.routeInstructionsContainer = document.getElementById('panel');
            });

    }

    search(searchItem: string) {
        let geocoder = this.platform.getGeocodingService();

        let bounds = this.map.getViewBounds();

        let geocodingParameters: H.service.ServiceParameters = {
            searchText: searchItem,
            mapView: `${bounds.getTop().toFixed(4)},${bounds.getLeft().toFixed(4)};${bounds.getBottom().toFixed(4)},${bounds.getRight().toFixed(4)}`
        };

        geocoder.geocode(geocodingParameters,
            (result: H.service.ServiceResult) => {
                console.log(result.Response.View[0]);
            },
            error => {
                console.log(error);
            }
        );
    }

    route = (routeItems: string[], resultsDiv: string, options: any) => {

        let router = this.platform.getRoutingService();
        let routingParameters: any = {
            'mode': 'fastest;car',
            'routeattributes': 'waypoints,summary,shape,legs',
            'maneuverattributes': 'direction,action',
            'representation': 'display'
        };

        routeItems.forEach((value, index) => {
            routingParameters['waypoint' + index] = value;
        });

        router.calculateRoute(routingParameters,
            (result: H.service.ServiceResult) => {
                let route,
                    routeShape,
                    startPoint,
                    endPoint,
                    linestring: any;
                if (result.response.route) {
                    // Pick the first route from the response:
                    route = result.response.route[0];
                    this.addWaypointsToPanel(route.waypoint);
                    this.addManueversToPanel(route);
                    this.addSummaryToPanel(route.summary);
                    // Pick the route's shape:
                    routeShape = route.shape;

                    // Create a linestring to use as a point source for the route line
                    linestring = new (<any>H.geo).LineString();

                    // Push all the points in the shape into the linestring:
                    routeShape.forEach(function (point) {
                        var parts = point.split(',');
                        linestring.pushLatLngAlt(parts[0], parts[1]);
                    });

                    // Retrieve the mapped positions of the requested waypoints:

                    startPoint = route.waypoint[0].mappedPosition;
                    endPoint = route.waypoint[1].mappedPosition;

                    // Create a polyline to display the route
                    let routeLine = new H.map.Polyline(linestring, {
                        style: { lineWidth: 10 },

                    });

                    var markupTemplate = '<svg xmlns="http://www.w3.org/2000/svg" width="28px" height="36px"><path d="M 19 31 C 19 32.7 16.3 34 13 34 C 9.7 34 7 32.7 7 31 C 7 29.3 9.7 28 13 28 C 16.3 28 19 29.3 19 31 Z" fill="#000" fill-opacity=".2"/><path d="M 13 0 C 9.5 0 6.3 1.3 3.8 3.8 C 1.4 7.8 0 9.4 0 12.8 C 0 16.3 1.4 19.5 3.8 21.9 L 13 31 L 22.2 21.9 C 24.6 19.5 25.9 16.3 25.9 12.8 C 25.9 9.4 24.6 6.1 22.1 3.8 C 19.7 1.3 16.5 0 13 0 Z" fill="#fff"/><path d="M 13 2.2 C 6 2.2 2.3 7.2 2.1 12.8 C 2.1 16.1 3.1 18.4 5.2 20.5 L 13 28.2 L 20.8 20.5 C 22.9 18.4 23.8 16.2 23.8 12.8 C 23.6 7.07 20 2.2 13 2.2 Z" fill="#18d"/><text x="13" y="19" font-size="12pt" font-weight="bold" text-anchor="middle" fill="#fff">${text}</text></svg>';
                    let addressTemplate = '<span>${Street} ${HouseNumber}</span><br><span>${City}, ${State} ${PostalCode}</span><br><span>${Country}</span>';
                    // Create a marker for the start point:

                    let geocoder = this.platform.getGeocodingService();

                    var startMarkerTemplate = markupTemplate.replace('${text}', 'A'),
                        icon = new H.map.Icon(startMarkerTemplate),
                        startMarker = new H.map.Marker({
                            lat: startPoint.latitude,
                            lng: startPoint.longitude
                        }, {
                                icon: icon
                            });


                    let startParams: H.service.ServiceParameters = {
                        'prox': `${route.waypoint[0].mappedPosition.latitude},${route.waypoint[0].mappedPosition.longitude}`,
                        'mode': 'retrieveAddresses',
                        'maxresults': '1'
                    }
                    geocoder.reverseGeocode(startParams,
                        result => {
                            console.log(result.Response.View[0].Result[0].Location);
                            let address = result.Response.View[0].Result[0].Location.Address;

                            startMarker.setData(addressTemplate.replace('${Street}', address.Street).replace('${HouseNumber}', address.HouseNumber).replace('${City}', address.City)
                                .replace('${State}', address.State).replace('${PostalCode}', address.PostalCode).replace('${Country}', address.Country));
                        },
                        error => {

                        }
                    );


                    // Create a marker for the end point:
                    var endMarkerTemplate = markupTemplate.replace('${text}', 'B'),
                        icon = new H.map.Icon(endMarkerTemplate),
                        endMarker = new H.map.Marker({
                            lat: endPoint.latitude,
                            lng: endPoint.longitude
                        }, {
                                icon: icon,
                                data: `<div>${route.waypoint[0].label}</div>`
                            });

                    let endParams: H.service.ServiceParameters = {
                        'prox': `${route.waypoint[1].mappedPosition.latitude},${route.waypoint[1].mappedPosition.longitude}`,
                        'mode': 'retrieveAddresses',
                        'maxresults': '1'
                    }
                    geocoder.reverseGeocode(endParams,
                        result => {
                            let address = result.Response.View[0].Result[0].Location.Address;

                            endMarker.setData(addressTemplate.replace('${Street}', address.Street).replace('${HouseNumber}', address.HouseNumber).replace('${City}', address.City)
                                .replace('${State}', address.State).replace('${PostalCode}', address.PostalCode).replace('${Country}', address.Country));
                        },
                        error => {

                        }
                    );

                    let group = new H.map.Group();

                    group.addObjects([routeLine, startMarker, endMarker]);
                    // Add the route polyline and the two markers to the map:
                    this.map.addObject(group);

                    // Set the map's viewport to make the whole route visible:
                    this.map.setViewBounds(routeLine.getBounds());

                    // setup info bubble

                    group.addEventListener('tap', (evt: any) => {
                        // event target is the marker itself, group is a parent event target
                        // for all objects that it contains
                        let bubble = new H.ui.InfoBubble(evt.target.getPosition(), {
                            // read custom data
                            content: evt.target.getData()
                        });
                        bubble.addClass('routeBubble');
                        // show info bubble
                        this.ui.addBubble(bubble);
                    }, false);
                }
            },
            (error: Error) => {
                console.log(error.message);
            }
        );
    }

    addManueversToPanel = (route: any) => {
        var nodeOL = document.createElement('ol'),
            i,
            j;

        nodeOL.style.fontSize = 'small';
        nodeOL.style.marginLeft = '5%';
        nodeOL.style.marginRight = '5%';
        nodeOL.className = 'directions';

        // Add a marker for each maneuver
        for (i = 0; i < route.leg.length; i += 1) {
            for (j = 0; j < route.leg[i].maneuver.length; j += 1) {
                // Get the next maneuver.
                let maneuver = route.leg[i].maneuver[j];

                var li = document.createElement('li'),
                    spanArrow = document.createElement('span'),
                    spanInstruction = document.createElement('span');

                spanArrow.className = 'arrow ' + maneuver.action;
                spanInstruction.innerHTML = maneuver.instruction;
                li.appendChild(spanArrow);
                li.appendChild(spanInstruction);

                nodeOL.appendChild(li);
            }
        }

        this.routeInstructionsContainer.appendChild(nodeOL);
    }

    addWaypointsToPanel = (waypoints: any) => {



        var nodeH3 = document.createElement('h3'),
            waypointLabels = [],
            i;


        for (i = 0; i < waypoints.length; i += 1) {
            waypointLabels.push(waypoints[i].label)
        }

        nodeH3.textContent = waypointLabels.join(' - ');

        this.routeInstructionsContainer.innerHTML = '';
        this.routeInstructionsContainer.appendChild(nodeH3);
    }

    addSummaryToPanel = (summary: any) => {
        var summaryDiv = document.createElement('div'),
            content = '';
        content += '<b>Total distance</b>: ' + summary.distance + 'm. <br/>';
        var duration = moment.duration(summary.travelTime, 'minutes');
        var time = moment(duration.asMilliseconds()).format('MM:ss');

        content += '<b>Travel Time</b>: ' + time + ' (in current traffic)';


        summaryDiv.style.fontSize = 'small';
        summaryDiv.style.marginLeft = '5%';
        summaryDiv.style.marginRight = '5%';
        summaryDiv.innerHTML = content;
        this.routeInstructionsContainer.appendChild(summaryDiv);
    }
}


(<any>Number.prototype).toMMSS = () => {
    return Math.floor(this / 60) + ' minutes ' + (this % 60) + ' seconds.';
}

