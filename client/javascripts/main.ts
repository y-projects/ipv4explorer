import { IPv4 } from "../../ipv4/index";
import * as L from "leaflet";

let mymap: L.Map = L.map("mapid").fitWorld();
/*.setView([0, 0], 1);.setMaxBounds([
    [-90, -180],
    [90, 180]
])*/

L.tileLayer("/tiles/{z}/{x}/{y}", {
	maxZoom: 16,
	attribution: "",
    id: "mapbox.streets",
    noWrap: true,
    bounds: [
        [-90, -180],
        [90, 180]
    ]
}).addTo(mymap);

interface IPoint {
    x: number;
    y: number;
}

function getIpVal(x: number, y: number, z: number): number {
    let ipval: number = 0;
    let point: IPoint = { x: 0, y: 0 };

    for (var i:number = z; i > 0; i--) {

        point.x = x >> (i - 1) & 1;
        point.y = y >> (i - 1) & 1;

        let m:number = point.x | (point.y << 1);
        let n: number = point.x | point.y;

        ipval += m * Math.pow(2, n * (32 - ((z - i + 1) << 1)));

    }
    return ipval;
}

function getAbsolutePoint(map: L.Map, latlng: L.LatLng ): L.Point {
    const p: L.Point = map.project(latlng, map.getZoom());
    return p.multiplyBy(Math.pow(2, map.getMaxZoom() - map.getZoom() - 8)).floor();
}

function getLatLng(map: L.Map, point: IPoint, offset: number=0): L.LatLng {
    let ret: L.LatLng;
    try {
        let p: L.Point = new L.Point(point.x + offset, point.y + offset);
        let mypoint: L.Point = p.divideBy(Math.pow(2, map.getMaxZoom() - map.getZoom() - 8));
        ret = mymap.unproject(mypoint, map.getZoom());
    } catch (e) {
        throw e;
    }
    return ret;
}
function castLPoint(p: IPoint): L.Point {
    const point: L.Point = new L.Point(p.x, p.y);
    return point;
}

var popup: L.Popup = L.popup();

function onMapClick(e: any):void {
    
    const mypoint: L.Point = mymap.project(e.latlng, mymap.getZoom());
    const myip: IPv4 = IPv4.newIPv4FromPoint( getAbsolutePoint(mymap, e.latlng) );

    document.getElementById("show").className = "off";
    
    popup
        .setLatLng(e.latlng)
        .setContent(myip.toString())
        .openOn(mymap);
        
    query(myip.toString(), function (whois) {
        showModal(whois);
    });
    
}

function query(ip, callback) {
    
    var request = new XMLHttpRequest();
    request.open('GET', '/whois/'+ip, true);
    
    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        var resp = request.responseText;
        callback(resp);
      } else {
        // We reached our target server, but it returned an error
        console.log('We reached our target server, but it returned an error');
      }
    };
    
    request.onerror = function() {
      // There was a connection error of some sort
      console.log('There was a connection error of some sort');
    };
    
    request.send();

}

function queryNS(ns, callback) {
    
    var request = new XMLHttpRequest();
    request.open('GET', '/nslookup/'+ns, true);
    
    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        var resp = request.responseText;
        callback(resp);
      } else {
        // We reached our target server, but it returned an error
        console.log('We reached our target server, but it returned an error');
      }
    };
    
    request.onerror = function() {
      // There was a connection error of some sort
      console.log('There was a connection error of some sort');
    };
    
    request.send();

}

mymap.on("click", onMapClick);

let myip: IPv4 = IPv4.newIPv4FromString(document.getElementById("ip").innerText);

window.onload = function () {
    if (myip.toString() !== "0.0.0.0") {
        L.marker(getLatLng(mymap, castLPoint(myip.pPoint), 0.5)).addTo(mymap)
        .bindPopup("You are here.<br/>" + myip).openPopup();
    }
}

function showModal (content:string) {
    document.getElementById("show").className = "mini";
    document.querySelector("#show .whois").textContent = content;
}

export function addMarkerForIP ( searchString:string ) {

    let ipReg: string = "(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)";
    let fullReg: string = "^" + ipReg + "\." + ipReg + "\." + ipReg + "\." + ipReg + "$";
    let nsReg: string = "^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$";

    if ((new RegExp(fullReg)).test(searchString)) {
        let ipString = searchString;
        let ip: IPv4 = IPv4.newIPv4FromString(ipString);
        let latlng: L.LatLng = getLatLng(mymap, castLPoint(ip.pPoint), 0.5);
        //L.marker(latlng).addTo(mymap);
        mymap.panTo(latlng);
        mymap.setView(latlng, 16);
        popup
            .setLatLng(latlng)
            .setContent(ip.toString())
            .openOn(mymap);
        query(ip.toString(), function (whois) {
            showModal(whois);
        });
    } else if ((new RegExp(nsReg)).test(searchString)) {
        let ns = searchString;
        queryNS(ns, function (ipString) {
            let ip: IPv4 = IPv4.newIPv4FromString(ipString);
            let latlng: L.LatLng = getLatLng(mymap, castLPoint(ip.pPoint), 0.5);
            mymap.panTo(latlng);
            mymap.setView(latlng, 16);
            popup
                .setLatLng(latlng)
                .setContent(ip.toString())
                .openOn(mymap);

            query(ip.toString(), function (whois) {
                showModal(whois);
            });
            
        });
    } else {

    }


}