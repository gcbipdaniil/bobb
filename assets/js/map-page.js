document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const loadingIndicator = document.getElementById('map-loading-indicator');
    const mapContainer = document.getElementById('map-container');
    const layerToggle = document.getElementById('layer-toggle-checkbox');
    const locationModal = document.getElementById('location-card-modal');
    const locationCloseBtn = document.getElementById('location-card-close');
    const locationTitle = document.getElementById('location-card-title');
    const locationDescription = document.getElementById('location-card-description');
    const mainImageContainer = document.getElementById('location-card-main-image');
    const thumbnailContainer = document.getElementById('location-card-thumbnails');

    // --- State Variables ---
    let panzoomInstance = null;
    let mapScene = null;
    let locationData = null;
    let baseMapImage = null;
    let metroLayerImage = null;
    let lastScale = -1; // Initialize with a value that will always trigger the first update

    /**
     * The main render loop, called by requestAnimationFrame.
     * Checks for scale changes and updates markers if needed.
     */
    const animationLoop = () => {
        if (panzoomInstance) {
            const currentScale = panzoomInstance.getScale();
            if (currentScale !== lastScale) {
                updateMarkerScale(currentScale);
                lastScale = currentScale;
            }
        }
        requestAnimationFrame(animationLoop);
    };

    /**
     * Adjusts marker size based on the provided map zoom level.
     */
    const updateMarkerScale = (scale) => {
        if (!mapScene) return;
        const markers = mapScene.querySelectorAll('.map-marker');
        const minMarkerScale = 0.5;
        const maxMarkerScale = 2.0;
        let counterScale = 1 / scale;
        counterScale = Math.max(minMarkerScale, Math.min(counterScale, maxMarkerScale));

        markers.forEach(marker => {
            const hoverScale = marker.isHovered ? 1.15 : 1;
            marker.style.transform = `translate(-50%, -100%) scale(${counterScale}) scale(${hoverScale})`;
        });
    };

    /**
     * Renders markers for a specific layer.
     */
    const renderMarkers = (layer) => {
        if (!mapScene || !locationData) return;
        mapScene.querySelectorAll('.map-marker').forEach(marker => marker.remove());
        locationData[layer].forEach(loc => {
            const marker = document.createElement('div');
            marker.className = 'map-marker';
            marker.style.left = `${loc.x * 100}%`;
            marker.style.top = `${loc.y * 100}%`;
            const initial = loc.name.charAt(0).toUpperCase();
            marker.innerHTML = `<div class="marker-pin" style="background-color:${loc.color || '#d32f2f'}">${initial}</div><div class="marker-label">${loc.name}</div>`;
            marker.isHovered = false;

            marker.addEventListener('click', () => showLocationCard(loc));
            marker.addEventListener('mouseenter', () => {
                marker.isHovered = true;
                updateMarkerScale(panzoomInstance.getScale());
            });
            marker.addEventListener('mouseleave', () => {
                marker.isHovered = false;
                updateMarkerScale(panzoomInstance.getScale());
            });
            mapScene.appendChild(marker);
        });
        updateMarkerScale(panzoomInstance.getScale());
    };

    const showLocationCard = (data) => {
        locationTitle.textContent = data.name;
        locationDescription.textContent = data.description;
        mainImageContainer.innerHTML = '';
        thumbnailContainer.innerHTML = '';
        if (data.photos && data.photos.length > 0) {
            const mainImage = document.createElement('img');
            mainImage.src = data.photos[0];
            mainImageContainer.appendChild(mainImage);
            data.photos.forEach((photoUrl, index) => {
                const thumbWrapper = document.createElement('div');
                thumbWrapper.className = 'location-card-thumbnail';
                if (index === 0) thumbWrapper.classList.add('active');
                const thumbImage = document.createElement('img');
                thumbImage.src = photoUrl;
                thumbWrapper.appendChild(thumbImage);
                thumbWrapper.addEventListener('click', () => {
                    mainImage.src = photoUrl;
                    thumbnailContainer.querySelector('.active')?.classList.remove('active');
                    thumbWrapper.classList.add('active');
                });
                thumbnailContainer.appendChild(thumbWrapper);
            });
        }
        locationModal.classList.add('visible');
    };

    const hideLocationCard = () => {
        locationModal.classList.remove('visible');
    };

    const toggleMetroLayer = () => {
        const showMetro = layerToggle.checked;
        if (baseMapImage) baseMapImage.classList.toggle('dimmed', showMetro);
        if (metroLayerImage) metroLayerImage.classList.toggle('visible', showMetro);
        renderMarkers(showMetro ? 'metro' : 'surface');
    };

    const initializeMap = () => {
        fetch('/assets/data/locations.json')
            .then(response => response.json())
            .then(data => {
                locationData = data;
                const mapLoader = new Image();
                mapLoader.src = '/assets/images/map.webp';
                mapLoader.onload = () => {
                    mapScene = document.createElement('div');
                    mapScene.className = 'map-scene';
                    mapScene.style.width = `${mapLoader.naturalWidth}px`;
                    mapScene.style.height = `${mapLoader.naturalHeight}px`;
                    mapScene.style.position = 'relative';

                    baseMapImage = document.createElement('img');
                    baseMapImage.src = mapLoader.src;
                    baseMapImage.classList.add('map-image-full');

                    metroLayerImage = document.createElement('img');
                    metroLayerImage.src = '/assets/images/map_metro.png';
                    metroLayerImage.classList.add('metro-overlay');
                    metroLayerImage.classList.add('metro-overlay-hidden');

                    mapScene.appendChild(baseMapImage);
                    mapScene.appendChild(metroLayerImage);
                    mapContainer.appendChild(mapScene);

                    panzoomInstance = Panzoom(mapScene, {
                        maxScale: 5,
                        minScale: 0.3,
                        startScale: 0.3,
                        contain: 'outside',
                        canvas: true,
                    });
                    mapContainer.addEventListener('wheel', panzoomInstance.zoomWithWheel);

                    renderMarkers('surface');

                    // Start the animation loop for real-time updates
                    animationLoop();

                    loadingIndicator.classList.add('hidden');
                };
                mapLoader.onerror = () => { console.error('Map image failed to load.'); };
            })
            .catch(error => { console.error('Failed to load location data:', error); });
    };

    // --- Event Listeners ---
    layerToggle.addEventListener('change', toggleMetroLayer);
    locationCloseBtn.addEventListener('click', hideLocationCard);
    locationModal.addEventListener('click', (e) => {
        if (e.target === locationModal) {
            hideLocationCard();
        }
    });

    initializeMap();
});
