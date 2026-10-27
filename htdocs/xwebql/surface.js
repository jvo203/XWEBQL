let THREE = null;
let OrbitControls = null;

let container;
let camera;
let controls;
let scene;
let renderer;
let mesh;
let wireTexture;
let geometry;
let material;
let isActive = false;
let initTimer = 0;
let surfacePrepared = false;
let wireTextureReady = false;
let wireTextureLoadFailed = false;

const segments = 512;
let surfacePoint = null;
let threeReadyPromise = null;
let axisResources = [];

window.addEventListener('beforeunload', function () {
    if (isActive) {
        closeSurface();
    }
});

window.addEventListener('pagehide', function () {
    if (isActive) {
        closeSurface();
    }
});

function ensureThreeDeps() {
    if (THREE != null && OrbitControls != null) {
        return Promise.resolve();
    }

    if (threeReadyPromise != null) {
        return threeReadyPromise;
    }

    threeReadyPromise = new Promise((resolve) => {
        function attemptResolve() {
            if (window.THREE != null && window.OrbitControls != null) {
                THREE = window.THREE;
                OrbitControls = window.OrbitControls;
                surfacePoint = new THREE.Vector3();
                resolve();
                return;
            }

            setTimeout(attemptResolve, 10);
        }

        attemptResolve();
    });

    return threeReadyPromise;
}

function getMainRect() {
    return document.getElementById('mainDiv').getBoundingClientRect();
}

function getSurfaceDimensions() {
    return imageContainer.image_bounding_dims;
}

function getAspectRatio() {
    const imageBoundingDims = getSurfaceDimensions();
    return imageBoundingDims.height / imageBoundingDims.width;
}

function getToneMappedPixel(imageFrame, pixel) {
    const pmin = Math.log(imageFrame.pixel_range.min_pixel);
    const pmax = Math.log(imageFrame.pixel_range.max_pixel);
    const raw = imageFrame.pixels[pixel];

    return 255 * clamp((raw - pmin) / (pmax - pmin), 0, 1);
}

function meshFunction(x, y, target) {
    const imageFrame = imageContainer;
    const imageBoundingDims = imageFrame.image_bounding_dims;

    const xcoord = Math.round(imageBoundingDims.x1 + (1 - x) * (imageBoundingDims.width - 1));
    const ycoord = Math.round(imageBoundingDims.y1 + (1 - y) * (imageBoundingDims.height - 1));
    const pixel = ycoord * imageFrame.width + xcoord;
    const z = getToneMappedPixel(imageFrame, pixel) - 127;
    const aspect = imageBoundingDims.height / imageBoundingDims.width;

    target.set(x - 0.5, (y - 0.5) * aspect, z / 2048);
}

function colourFunction(x, y) {
    const imageFrame = imageContainer;
    const imageBoundingDims = imageFrame.image_bounding_dims;
    const aspect = imageBoundingDims.height / imageBoundingDims.width;

    const xcoord = Math.round(imageBoundingDims.x1 + ((1 - x) - 0.5) * (imageBoundingDims.width - 1));
    const ycoord = Math.round(imageBoundingDims.y1 + ((-y) / aspect + 0.5) * (imageBoundingDims.height - 1));
    const pixel = ycoord * imageFrame.width + xcoord;
    const toneMappedPixel = Math.round(getToneMappedPixel(imageFrame, pixel));

    return new THREE.Color('rgb(' + toneMappedPixel + ',' + toneMappedPixel + ',' + toneMappedPixel + ')');
}

function getCoordinateAxisInfo(axis) {
    const rawCtype = axis === 'ra' ? fitsData.CTYPE1 : fitsData.CTYPE2;
    const ctype = typeof rawCtype === 'string' ? rawCtype.trim().toUpperCase() : '';
    const longitude = axis === 'ra';
    const supported = longitude
        ? ctype.indexOf('RA') > -1 || ctype.indexOf('GLON') > -1 || ctype.indexOf('ELON') > -1
        : ctype.indexOf('DEC') > -1 || ctype.indexOf('GLAT') > -1 || ctype.indexOf('ELAT') > -1;
    const hasLinearScale = longitude ? fitsData.CDELT1 != null : fitsData.CDELT2 != null;

    if (!supported || (!hasLinearScale && typeof CD_matrix !== 'function')) {
        return null;
    }

    let label = longitude ? 'RA' : 'DEC';
    if (ctype.indexOf('GLON') > -1) label = 'GLON';
    if (ctype.indexOf('GLAT') > -1) label = 'GLAT';
    if (ctype.indexOf('ELON') > -1) label = 'ELON';
    if (ctype.indexOf('ELAT') > -1) label = 'ELAT';

    return { longitude, label };
}

function getFitsPixelAtSurfacePoint(xFraction, yFraction) {
    const image = imageContainer;
    const bounds = image.image_bounding_dims;
    const imageX = bounds.x1 + (1 - xFraction) * (bounds.width - 1);
    const imageY = bounds.y1 + (1 - yFraction) * (bounds.height - 1);

    return {
        x: imageX * fitsData.width / image.width,
        y: imageY * fitsData.height / image.height
    };
}

function formatSurfaceCoordinate(axisInfo, pixel) {
    if (axisInfo.longitude && fitsData.CDELT1 != null) {
        try {
            if (axisInfo.label === 'RA' && coordsFmt !== 'DMS') {
                return x2hms(pixel.x);
            }
            return x2dms(pixel.x);
        } catch (_) {
        }
    }

    if (!axisInfo.longitude && fitsData.CDELT2 != null) {
        try {
            return y2dms(pixel.y);
        } catch (_) {
        }
    }

    if (typeof CD_matrix === 'function') {
        try {
            const coordinates = CD_matrix(pixel.x, fitsData.height - pixel.y);
            if (axisInfo.longitude) {
                return axisInfo.label === 'RA' && coordsFmt !== 'DMS'
                    ? RadiansPrintHMS(coordinates[0])
                    : RadiansPrintDMS(coordinates[0]);
            }
            return RadiansPrintDMS(coordinates[1]);
        } catch (error) {
            console.warn('Unable to format surface coordinate:', error);
        }
    }

    return '';
}

function getSurfaceCountRange() {
    const range = imageContainer.pixel_range;
    const minCount = Math.ceil(range.min_pixel);
    const maxCount = Math.floor(range.max_pixel);

    if (!Number.isFinite(minCount) || !Number.isFinite(maxCount) || minCount <= 0 || maxCount < minCount) {
        return null;
    }

    return { minCount, maxCount };
}

function countToSurfaceZ(count, countRange) {
    const minLog = Math.log(countRange.minCount);
    const maxLog = Math.log(countRange.maxCount);
    const fraction = maxLog === minLog
        ? 0.5
        : clamp((Math.log(count) - minLog) / (maxLog - minLog), 0, 1);

    return (255 * fraction - 127) / 2048;
}

function addSurfaceLabel(text, position, width) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;

    const context = canvas.getContext('2d');
    const color = theme === 'light' ? '#111111' : '#ffcc00';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = '48px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const labelMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(labelMaterial);
    sprite.position.copy(position);
    sprite.scale.set(width, width * canvas.height / canvas.width, 1);
    scene.add(sprite);

    axisResources.push(texture, labelMaterial);
}

function addSurfaceAxes() {
    if (typeof fitsData === 'undefined' || fitsData == null || imageContainer == null) {
        return;
    }

    const raAxis = getCoordinateAxisInfo('ra');
    const decAxis = getCoordinateAxisInfo('dec');

    const aspect = getAspectRatio();
    const axisZ = -0.08;
    const margin = Math.max(0.045, aspect * 0.045);
    const tickSize = Math.max(0.012, aspect * 0.012);
    const axisColor = theme === 'light' ? 0x111111 : 0xffcc00;
    const lineMaterial = new THREE.LineBasicMaterial({ color: axisColor });
    const linePoints = [];

    function addSegment(x1, y1, x2, y2) {
        linePoints.push(
            new THREE.Vector3(x1, y1, axisZ),
            new THREE.Vector3(x2, y2, axisZ)
        );
    }

    if (raAxis != null) {
        const axisY = -aspect / 2;
        addSegment(-0.5, axisY, 0.5, axisY);

        for (let index = 0; index <= 4; index++) {
            const fraction = index / 4;
            const x = fraction - 0.5;
            addSegment(x, axisY, x, axisY - tickSize);

            const pixel = getFitsPixelAtSurfacePoint(fraction, 0);
            const label = formatSurfaceCoordinate(raAxis, pixel);
            if (label !== '') {
                addSurfaceLabel(label, new THREE.Vector3(x, axisY - margin * 0.55, axisZ), 0.2);
            }
        }

        addSurfaceLabel(raAxis.label, new THREE.Vector3(0.56, axisY - margin * 1.5, axisZ), 0.13);
    }

    if (decAxis != null) {
        const axisX = -0.5;
        addSegment(axisX, -aspect / 2, axisX, aspect / 2);

        for (let index = 0; index <= 4; index++) {
            const fraction = index / 4;
            const y = (fraction - 0.5) * aspect;
            addSegment(axisX, y, axisX - tickSize, y);

            const pixel = getFitsPixelAtSurfacePoint(0, fraction);
            const label = formatSurfaceCoordinate(decAxis, pixel);
            if (label !== '') {
                addSurfaceLabel(label, new THREE.Vector3(axisX - margin * 0.6, y, axisZ), 0.2);
            }
        }

        addSurfaceLabel(decAxis.label, new THREE.Vector3(axisX - margin * 1.5, aspect / 2 + margin, axisZ), 0.13);
    }

    const countRange = getSurfaceCountRange();
    if (countRange != null) {
        const axisX = -0.5;
        const axisY = -aspect / 2;
        const topZ = countToSurfaceZ(countRange.maxCount, countRange);

        linePoints.push(
            new THREE.Vector3(axisX, axisY, axisZ),
            new THREE.Vector3(axisX, axisY, topZ + margin * 0.35)
        );

        let previousCount = null;
        for (let index = 0; index <= 4; index++) {
            const fraction = index / 4;
            const count = Math.round(Math.exp(
                Math.log(countRange.minCount) + fraction * (Math.log(countRange.maxCount) - Math.log(countRange.minCount))
            ));
            if (count === previousCount) {
                continue;
            }
            previousCount = count;

            const z = countToSurfaceZ(count, countRange);
            linePoints.push(
                new THREE.Vector3(axisX, axisY, z),
                new THREE.Vector3(axisX + tickSize, axisY, z)
            );
            addSurfaceLabel(String(count), new THREE.Vector3(axisX - margin * 0.7, axisY, z), 0.2);
        }

        addSurfaceLabel('COUNTS (log scale)', new THREE.Vector3(axisX - margin * 1.5, axisY, topZ + margin * 0.8), 0.32);
    }

    if (linePoints.length > 0) {
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        scene.add(new THREE.LineSegments(lineGeometry, lineMaterial));
        axisResources.push(lineGeometry, lineMaterial);
    } else {
        lineMaterial.dispose();
    }
}

function disposeSurfaceResources() {
    window.removeEventListener('resize', onWindowResize);

    if (scene != null) {
        scene.clear();
    }

    if (camera != null) {
        camera.clear();
    }

    if (geometry != null) {
        geometry.dispose();
    }

    if (material != null) {
        material.dispose();
    }

    if (renderer != null) {
        renderer.setAnimationLoop(null);
        renderer.dispose();
    }

    if (controls != null) {
        controls.dispose();
    }

    if (wireTexture != null) {
        wireTexture.dispose();
    }

    for (const resource of axisResources) {
        resource.dispose();
    }
    axisResources = [];
    surfacePrepared = false;
    wireTextureReady = false;
    wireTextureLoadFailed = false;

    container = null;
    camera = null;
    controls = null;
    scene = null;
    renderer = null;
    mesh = null;
    wireTexture = null;
    geometry = null;
    material = null;

    console.log('Surface resources disposed');
}

function closeSurface() {
    if (initTimer !== 0) {
        clearTimeout(initTimer);
        initTimer = 0;
    }

    isActive = false;
    disposeSurfaceResources();
    threeReadyPromise = null;
    d3.select('#ThreeJS').remove();
}

function buildGeometry() {
    geometry = new THREE.PlaneGeometry(1, getAspectRatio(), segments, segments);

    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);

    for (let iy = 0; iy <= segments; iy++) {
        for (let ix = 0; ix <= segments; ix++) {
            const index = iy * (segments + 1) + ix;
            const x = ix / segments;
            const y = iy / segments;

            meshFunction(x, y, surfacePoint);
            position.setXYZ(index, surfacePoint.x, surfacePoint.y, surfacePoint.z);

            const color = colourFunction(surfacePoint.x, surfacePoint.y);
            colors[3 * index] = color.r;
            colors[3 * index + 1] = color.g;
            colors[3 * index + 2] = color.b;
        }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
}

function showPreparedSurface() {
    if (!isActive || !surfacePrepared || !wireTextureReady || renderer == null || material == null) {
        return;
    }

    if (wireTextureLoadFailed) {
        console.error('Unable to load the 3D surface wire texture; showing the grayscale surface without the wire overlay.');
        material.map = null;
        material.needsUpdate = true;
        if (wireTexture != null) {
            wireTexture.dispose();
            wireTexture = null;
        }

        const errorMessage = document.createElement('div');
        errorMessage.setAttribute('role', 'alert');
        errorMessage.textContent = 'Wire texture failed to load; showing grayscale surface without the wire overlay.';
        Object.assign(errorMessage.style, {
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: '1',
            padding: '8px',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            pointerEvents: 'none'
        });
        container.appendChild(errorMessage);
    }

    controls.update();
    renderer.render(scene, camera);
    renderer.domElement.style.visibility = 'visible';
    renderer.setAnimationLoop(animateSurface);
    d3.select('#hourglassThreeJS').remove();
}

function initSurfaceScene() {
    initTimer = 0;

    if (!isActive) {
        return;
    }

    const rect = getMainRect();
    const screenWidth = rect.width;
    const screenHeight = rect.height;

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, screenWidth / screenHeight, 0.01, 100);
    camera.position.set(1.15, -1.35, 0.85);
    camera.up.set(0, 0, 1);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(screenWidth, screenHeight);
    renderer.domElement.style.visibility = 'hidden';

    container = document.getElementById('ThreeJS');
    container.appendChild(renderer.domElement);

    surfacePrepared = false;
    wireTextureReady = false;
    wireTextureLoadFailed = false;
    wireTexture = new THREE.TextureLoader().load(
        'https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/square.png',
        () => {
            if (!isActive) {
                return;
            }
            wireTextureReady = true;
            showPreparedSurface();
        },
        undefined,
        () => {
            if (!isActive) {
                return;
            }
            wireTextureLoadFailed = true;
            wireTextureReady = true;
            showPreparedSurface();
        }
    );
    wireTexture.wrapS = THREE.RepeatWrapping;
    wireTexture.wrapT = THREE.RepeatWrapping;
    wireTexture.repeat.set(segments, segments);
    wireTexture.colorSpace = THREE.SRGBColorSpace;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 0.35;
    controls.maxDistance = 4.0;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 0, 0);
    controls.update();

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(1.5, -1.0, 2.0);
    scene.add(directionalLight);

    buildGeometry();

    material = new THREE.MeshPhongMaterial({
        map: wireTexture,
        vertexColors: true,
        side: THREE.DoubleSide
    });

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    addSurfaceAxes();
    window.addEventListener('resize', onWindowResize);

    surfacePrepared = true;
    showPreparedSurface();
}

function init_surface() {
    if (isActive) {
        closeSurface();
    }

    const div = d3.select('body').append('div')
        .attr('id', 'ThreeJS')
        .attr('class', 'threejs');

    div.append('span')
        .attr('id', 'closeThreeJS')
        .attr('class', 'close myclose')
        .on('click', closeSurface)
        .text('×');

    div.append('img')
        .attr('id', 'hourglassThreeJS')
        .attr('class', 'hourglass')
        .attr('src', 'https://cdn.jsdelivr.net/gh/jvo203/fits_web_ql/htdocs/fitswebql/loading.gif')
        .attr('alt', 'hourglass')
        .style('width', 200)
        .style('height', 200);

    isActive = true;

    ensureThreeDeps().then(() => {
        if (!isActive) {
            return;
        }

        initTimer = setTimeout(initSurfaceScene, 50);
    });
}

function onWindowResize() {
    if (camera == null || renderer == null) {
        return;
    }

    const rect = getMainRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
}

function animateSurface() {
    if (!isActive || renderer == null) {
        return;
    }

    controls.update();
    renderer.render(scene, camera);
}
