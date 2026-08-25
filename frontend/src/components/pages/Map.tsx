import { MapContainer, Marker, Popup, useMap, useMapEvent } from 'react-leaflet';
import L, { CRS, LatLng, LatLngBounds } from 'leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import LiteYouTubeEmbed from 'react-lite-youtube-embed';

import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css';
import './../../assets/less/App.less';

import {
    MAP_X,
    MAP_Y,
    TILE_MAX_ZOOM,
    TILE_MIN_ZOOM,
    TILE_SIZE,
    TILE_URL,
    TILE_ZOOM_OFFSET
} from '../../lib/constants';
import { iconLOTR } from '../widgets/Icon';
import { LotrSpinner } from '../widgets/Spinner';
import { getMapMarkers, log } from '../../lib/utils';
import { MapLocation } from '../../lib/interfaces';

const mapBounds: LatLngBounds = new LatLngBounds([0, 0], [MAP_Y, MAP_X]);
const mapCenter: LatLng = new LatLng(2066, 4268);
const defaultZoom = -1;
const maxZoom = 3;

// Dragging markers around and exporting the result is for maintaining the
// location list, not for visitors, so it only turns on for /map?edit
const isEditMode = () => new URLSearchParams(window.location.search).has('edit');

/**
 * CRS.Simple projects lat to -pixelY, which anchors Leaflet's tile grid to
 * lat 0 -- the bottom edge of the map -- and leaves its y coordinate counting
 * upwards through negative numbers. generate-tiles.mjs names tile rows from the
 * bottom up to match, and the zoom is offset to keep directory names positive.
 */
const LotrTileLayer = L.TileLayer.extend({
    getTileUrl(coords: L.Coords): string {
        const { _url } = this as unknown as { _url: string };

        return L.Util.template(_url, {
            z: coords.z + TILE_ZOOM_OFFSET,
            x: coords.x,
            y: -coords.y - 1
        });
    }
}) as unknown as new (url: string, options: L.TileLayerOptions) => L.TileLayer;

const MapTiles = (props: { onReady: () => void }) => {
    const map = useMap();
    const { onReady } = props;

    useEffect(() => {
        const layer: L.TileLayer = new LotrTileLayer(TILE_URL, {
            tileSize: TILE_SIZE,
            // GridLayer defaults minZoom to 0 and discards any tile request
            // below it, which on this map is all of them
            minZoom: TILE_MIN_ZOOM,
            maxZoom,
            minNativeZoom: TILE_MIN_ZOOM,
            // Past this the tiles are upscaled rather than re-cut, since it is
            // where the master image runs out of pixels
            maxNativeZoom: TILE_MAX_ZOOM,
            bounds: mapBounds,
            noWrap: true,
            // Hold a wider ring of tiles around the viewport, and fetch them
            // while panning rather than only once it stops
            keepBuffer: 4,
            updateWhenIdle: false,
            // Stretch the tiles already on screen through the zoom animation
            // instead of re-requesting on every fractional step
            updateWhenZooming: false
        });

        layer.once('load', onReady);
        // Don't strand the spinner if the tiles can't be reached at all
        layer.once('tileerror', onReady);
        layer.addTo(map);

        return () => {
            layer.remove();
        };
    }, [map, onReady]);

    return null;
};

/**
 * Holds the furthest zoom-out at the point where the map still fills the
 * viewport. With a fixed minZoom you can zoom out past the edge of the map,
 * and maxBounds then fights every drag to haul the centre back.
 */
const ClampMinZoomToViewport = () => {
    const map = useMap();

    useEffect(() => {
        const clamp = () => {
            map.setMinZoom(Math.max(map.getBoundsZoom(mapBounds), TILE_MIN_ZOOM));
        };

        clamp();
        map.on('resize', clamp);

        return () => {
            map.off('resize', clamp);
        };
    }, [map]);

    return null;
};

// Reads off the coordinates of a spot on the map, in the [lat, lng] order that
// New_MapData.json wants. The feedback form tells people to suggest a location
// by clicking the map for its coordinates, so this is not editor-only.
const CoordinateInspector = () => {
    const map = useMap();

    useMapEvent('click', event => {
        const { lat, lng } = event.latlng;

        L.popup()
            .setLatLng(event.latlng)
            .setContent(`You clicked the map at ${Math.round(lat)}, ${Math.round(lng)}`)
            .openOn(map);
    });

    return null;
};

export const LOTRMap = () => {
    const [mapIsLoaded, setMapIsLoaded] = useState(false);
    const editMode = useMemo(isEditMode, []);
    // Deep-cloning 90 markers is not worth redoing on every render
    const baseMarkers = useMemo(getMapMarkers, []);
    const [draggedMarkers, setDraggedMarkers] = useState<MapLocation[] | null>(null);
    const mapMarkers = draggedMarkers ?? baseMarkers;

    const handleMapReady = useCallback(() => setMapIsLoaded(true), []);

    const handleMarkerDrag = useCallback((marker: MapLocation) => {
        return (event: L.DragEndEvent) => {
            const { lat, lng } = event.target.getLatLng();

            log(`${marker.name}: ${Math.round(lat)}, ${Math.round(lng)}`);

            setDraggedMarkers(current => (current ?? baseMarkers).map(candidate => (
                candidate.name === marker.name
                    ? { ...candidate, location: [lat, lng] as L.LatLngExpression }
                    : candidate
            )));
        };
    }, [baseMarkers]);

    const exportMapMarkers = () => {
        const jsonString = JSON.stringify({ locations: mapMarkers }, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const link = document.createElement('a');

        link.href = URL.createObjectURL(blob);
        link.download = 'map_markers.json';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    return (
        <div id='mapBackground'>
            <LotrSpinner mapIsLoaded={mapIsLoaded} />

            <div id="mapContainer">
                {editMode && <button onClick={exportMapMarkers}>Export Markers</button>}
                <MapContainer
                    zoomControl={false}
                    id="lotrMap"
                    fadeAnimation={true}
                    bounds={mapBounds}
                    maxBounds={mapBounds}
                    // 1.0 -- what the old value of 100 clamped to -- makes the
                    // edge of the map a dead stop; this leaves some give
                    maxBoundsViscosity={0.75}
                    scrollWheelZoom={true}
                    zoomAnimation={true}
                    center={mapCenter}
                    zoom={defaultZoom}
                    // 0 gives continuous fractional zoom rather than snapping.
                    // zoomDelta has to clear zoomSnap, or keyboard zoom rounds
                    // straight back to the level it started on
                    zoomSnap={0}
                    zoomDelta={0.5}
                    maxZoom={maxZoom}
                    minZoom={TILE_MIN_ZOOM}
                    // Trackpads fire wheel events far faster than the map can
                    // animate, and queueing one zoom per event is the stutter
                    wheelDebounceTime={40}
                    wheelPxPerZoomLevel={120}
                    inertiaDeceleration={2000}
                    crs={CRS.Simple}
                >
                    <MapTiles onReady={handleMapReady} />
                    <ClampMinZoomToViewport />
                    <CoordinateInspector />

                    {mapMarkers.map((marker: MapLocation) => (
                        <Marker
                            key={marker.name}
                            title={marker.name}
                            alt={marker.name}
                            riseOnHover={true}
                            icon={iconLOTR}
                            draggable={editMode}
                            position={marker.location}
                            eventHandlers={editMode ? { dragend: handleMarkerDrag(marker) } : undefined}
                        >
                            <Popup
                                className='video-popup'
                                keepInView={true}
                            >
                                <LiteYouTubeEmbed
                                    poster="maxresdefault"
                                    id={marker.url}
                                    title={marker.name}
                                    autoplay={true}
                                    muted={false}
                                />
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
};