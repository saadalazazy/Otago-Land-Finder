const [Map, MapView, BasemapToggle, Search, Home, FeatureLayer, GraphicsLayer, Graphic, Polyline, Point, Polygon, Multipoint, unionOperator, geodeticLengthOperator, centroidOperator, labelPointOperator, projectOperator, proximityOperator, distanceOperator] = await $arcgis.import([
  "@arcgis/core/Map.js",
  "@arcgis/core/views/MapView.js",
  "@arcgis/core/widgets/BasemapToggle.js",
  "@arcgis/core/widgets/Search.js",
  "@arcgis/core/widgets/Home.js",
  "@arcgis/core/layers/FeatureLayer.js",
  "@arcgis/core/layers/GraphicsLayer.js",
  "@arcgis/core/Graphic.js",
  "@arcgis/core/geometry/Polyline.js",
  "@arcgis/core/geometry/Point.js",
  "@arcgis/core/geometry/Polygon.js",
  "@arcgis/core/geometry/Multipoint.js",
  "@arcgis/core/geometry/operators/unionOperator.js",
  "@arcgis/core/geometry/operators/geodeticLengthOperator.js",
  "@arcgis/core/geometry/operators/centroidOperator.js",
  "@arcgis/core/geometry/operators/labelPointOperator.js",
  "@arcgis/core/geometry/operators/projectOperator.js",
  "@arcgis/core/geometry/operators/proximityOperator.js",
  "@arcgis/core/geometry/operators/distanceOperator.js"
]);

await geodeticLengthOperator.load();
await projectOperator.load();

const SERVICE_URL = "https://maps.orc.govt.nz/arcgis/rest/services/PropertyExternal/MapServer";

const SEARCH_DISTANCE = 20;

const TOUCH_GAP = 1;

const SAVE_URL = "http://localhost/Api/lands";


const ROAD_SYMBOL = { type: "simple-line", color: [0, 120, 120], width: 2 };
const CHOSEN_ROAD_SYMBOL = { type: "simple-line", color: [0, 120, 120], width: 6 };
const ROAD_GAP_SYMBOL = { type: "simple-line", color: [20, 20, 20], width: 2, style: "dash" };
const PROPERTY_SYMBOL = {
  type: "simple-fill",
  color: [255, 190, 0, 0.25],
  outline: { color: [190, 130, 0], width: 1 }
};
const PARCEL_SYMBOL = {
  type: "simple-fill",
  color: [0, 0, 0, 0],
  outline: { color: [60, 60, 60], width: 1, style: "dash" }
};
const MERGE_SYMBOL = {
  type: "simple-fill",
  color: [0, 160, 80, 0.3],
  outline: { color: [0, 120, 60], width: 2 }
};
const CHOSEN_LAND_SYMBOL = {
  type: "simple-fill",
  color: [220, 0, 0, 0.1],
  outline: { color: [220, 0, 0], width: 3 }
};
const ADDRESS_SYMBOL = {
  type: "simple-marker",
  color: [30, 30, 30],
  size: 10,
  outline: { color: [255, 255, 255], width: 2 }
};
const PICKED_POINT_SYMBOL = {
  type: "simple-marker",
  style: "diamond",
  color: [0, 90, 200],
  size: 14,
  outline: { color: [255, 255, 255], width: 2 }
};
const DRAWN_LINE_SYMBOL = { type: "simple-line", color: [0, 90, 200], width: 3 };
const DRAWN_SHAPE_SYMBOL = {
  type: "simple-fill",
  color: [0, 90, 200, 0.1],
  outline: { color: [0, 90, 200], width: 2 }
};
const FILE_POINT_SYMBOL = {
  type: "simple-marker",
  color: [140, 40, 170],
  size: 12,
  outline: { color: [255, 255, 255], width: 2 }
};
const FILE_LINE_SYMBOL = { type: "simple-line", color: [140, 40, 170], width: 3 };
const FILE_SHAPE_SYMBOL = {
  type: "simple-fill",
  color: [140, 40, 170, 0.1],
  outline: { color: [140, 40, 170], width: 2, style: "dash" }
};

const propertiesLayer = new FeatureLayer({ url: SERVICE_URL + "/0" });
const parcelsLayer = new FeatureLayer({ url: SERVICE_URL + "/1" });
const addressLayer = new FeatureLayer({ url: SERVICE_URL + "/2" });
const roadsLayer = new FeatureLayer({ url: SERVICE_URL + "/3" });

const map = new Map({ basemap: "topo-vector" });

const view = new MapView({
  container: "map",
  map: map,
  center: [169.6, -45.3],
  zoom: 7,
  popup: {
    dockEnabled: true,
    dockOptions: { position: "bottom-left", breakpoint: false, buttonEnabled: false }
  }
});

const basemapToggle = new BasemapToggle({ view: view, nextBasemap: "hybrid" });
view.ui.add(basemapToggle, "bottom-right");

const roadSearch = new Search({
  view: view,
  includeDefaultSources: false,
  locationEnabled: false,
  popupEnabled: false,
  resultGraphicEnabled: false,
  sources: [{
    layer: roadsLayer,
    name: "Roads",
    placeholder: "Search a road",
    searchFields: ["name"],
    outFields: ["name", "locality", "territorial_authority"],
    suggestionTemplate: "{name}, {locality}",
    searchTemplate: "{name}, {locality}",
    orderByFields: ["name", "locality"],
    maxSuggestions: 15
  }]
});
view.ui.add(roadSearch, "top-right");

const homeButton = new Home({
  view: view,
  goToOverride: function () {
    if (!isBusy) {
      resetAll();
    }
  }
});
view.ui.add(homeButton, "top-left");

await view.when();

const roadGraphics = new GraphicsLayer();
const landGraphics = new GraphicsLayer();
const chosenGraphics = new GraphicsLayer();
const fileGraphics = new GraphicsLayer();
const drawGraphics = new GraphicsLayer();
map.add(roadGraphics);
map.add(landGraphics);
map.add(chosenGraphics);
map.add(fileGraphics);
map.add(drawGraphics);

const districtSelect = document.getElementById("districtSelect");
const areaSelect = document.getElementById("areaSelect");
const roadSelect = document.getElementById("roadSelect");
const landSelect = document.getElementById("landSelect");
const saveButton = document.getElementById("saveButton");
const addMergeButton = document.getElementById("addMergeButton");
const mergeButton = document.getElementById("mergeButton");
const mergeTable = document.getElementById("mergeTable");
const mergeList = document.getElementById("mergeList");
const propertiesRadio = document.getElementById("propertiesRadio");
const parcelsRadio = document.getElementById("parcelsRadio");
const addressText = document.getElementById("addressText");
const statusText = document.getElementById("statusText");
const addButton = document.getElementById("addButton");
const finishButton = document.getElementById("finishButton");
const pointTable = document.getElementById("pointTable");
const pointList = document.getElementById("pointList");
const downloadButton = document.getElementById("downloadButton");
const fileInput = document.getElementById("fileInput");
const findFileButton = document.getElementById("findFileButton");

let areaRoads = [];
let chosenRoadLine = null;
let properties = [];
let parcels = [];
let ownPropertyCount = 0;
let ownParcelCount = 0;
let drawnPoints = [];
let adding = false;
let isBusy = false;
let fileShape = null;
let landsToMerge = [];

function setStatus(text) {
  statusText.textContent = text;
}

function addOption(select, value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  select.appendChild(option);
}

function resetSelect(select, hint) {
  select.innerHTML = "";
  addOption(select, "", hint);
  select.disabled = true;
}

function setBusy(busy) {
  isBusy = busy;
  const selects = [districtSelect, areaSelect, roadSelect, landSelect];
  for (const select of selects) {
    if (busy) {
      select.disabled = true;
    } else {
      select.disabled = select.options.length <= 1;
    }
  }
  propertiesRadio.disabled = busy;
  parcelsRadio.disabled = busy;
  roadSearch.disabled = busy;
  addButton.disabled = busy;
  finishButton.disabled = busy;
  downloadButton.disabled = busy;
  fileInput.disabled = busy;
  findFileButton.disabled = busy || fileShape === null;
  saveButton.disabled = busy || properties.length === 0;
  addMergeButton.disabled = busy;
  mergeButton.disabled = busy;
}

// Make text safe inside a where clause: O'Connell becomes O''Connell.
function sqlText(text) {
  return text.replaceAll("'", "''");
}
 function zoomTo(target) {
  try {
    view.goTo(target);
  } catch (error) {
  }
}

function formatArea(squareMeters) {
  if (!squareMeters) {
    return "-";
  }
  return squareMeters.toLocaleString("en-NZ", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " m²";
}

function formatMoney(value) {
  if (value === null || value === undefined) {
    return "-";
  }
  return "$" + value.toLocaleString("en-NZ");
}

function formatHectares(squareMeters) {
  if (!squareMeters) {
    return "-";
  }
  return (squareMeters / 10000).toLocaleString("en-NZ", { maximumFractionDigits: 3 }) + " ha";
}



function clearChosen() {
  chosenGraphics.removeAll();
  addressText.textContent = "-";
  view.closePopup();
}

function clearLand() {
  clearMergeList();
  resetSelect(landSelect, "Pick a land");
  landGraphics.removeAll();
  properties = [];
  parcels = [];
  ownPropertyCount = 0;
  ownParcelCount = 0;
  chosenRoadLine = null;
  saveButton.disabled = true;
  clearChosen();
}

function clearRoads() {
  resetSelect(roadSelect, "Pick a road");
  roadGraphics.removeAll();
  areaRoads = [];
  clearLand();
}


async function fillDistricts() {
  resetSelect(districtSelect, "Pick a district");
  setStatus("Loading districts…");
  try {
    const result = await roadsLayer.queryFeatures({
      where: "1=1",
      outFields: ["territorial_authority"],
      returnDistinctValues: true,
      returnGeometry: false,
      orderByFields: ["territorial_authority"]
    });

    for (const feature of result.features) {
      const district = feature.attributes.territorial_authority;
      if (district) {
        addOption(districtSelect, district, district);
      }
    }
    districtSelect.disabled = false;
    setStatus("Pick a district to start.");
  } catch (error) {
    console.error(error);
    setStatus("Could not load the districts. Check your internet and reload the page.");
  }
}

async function loadAreas(district) {
  resetSelect(areaSelect, "Pick an area");
  clearRoads();
  if (district === "") {
    return;
  }

  setBusy(true);
  setStatus("Loading areas…");
  try {
    const result = await roadsLayer.queryFeatures({
      where: "territorial_authority LIKE '%" + sqlText(district) + "%'",
      outFields: ["locality"],
      returnDistinctValues: true,
      returnGeometry: false,
      orderByFields: ["locality"]
    });

    for (const feature of result.features) {
      const area = feature.attributes.locality;
      if (area) {
        addOption(areaSelect, area, area);
      }
    }
    setStatus((areaSelect.options.length - 1) + " areas found. Pick an area.");
  } catch (error) {
    console.error(error);
    districtSelect.value = "";
    setStatus("Could not load areas. Check your internet and pick the district again.");
  } finally {
    setBusy(false);
  }
}



async function loadRoads(area) {
  clearRoads();
  if (area === "") {
    return;
  }

  setBusy(true);
  setStatus("Loading roads…");
  try {
    const result = await roadsLayer.queryFeatures({
      where: "locality = '" + sqlText(area) + "' AND territorial_authority LIKE '%" + sqlText(districtSelect.value) + "%'",
      outFields: ["name"],
      returnGeometry: true,
      outSpatialReference: view.spatialReference 
    });
    areaRoads = result.features;

    const names = [];
    for (const road of areaRoads) {
      road.symbol = ROAD_SYMBOL;
      roadGraphics.add(road);

      const name = road.attributes.name;
      if (name && !names.includes(name)) {
        names.push(name);
      }
    }

    names.sort();
    for (const name of names) {
      addOption(roadSelect, name, name);
    }

    setStatus(areaRoads.length + " road pieces found. Pick a road.");
  } catch (error) {
    console.error(error);
    areaSelect.value = "";
    setStatus("Could not load roads. Check your internet and pick the area again.");
  } finally {
    setBusy(false);
  }
}


async function askAlongRoad(layer, roadLine, orderByFields) {
  const result = await layer.queryFeatures({
    geometry: roadLine,
    distance: SEARCH_DISTANCE,
    units: "meters",
    spatialRelationship: "intersects",
    outFields: ["*"],
    returnGeometry: true,
    orderByFields: orderByFields,
    outSpatialReference: view.spatialReference
  });
  return result;
}

function roadNameStart(roadName) {
  const words = roadName.toLowerCase().split(" ");
  if (words.length > 1) {
    words.pop();
  }
  return words.join(" ");
}

function isOnRoad(streetName, start) {
  if (!streetName) {
    return false;
  }
  const street = streetName.toLowerCase();
  return street === start || street.startsWith(start + " ");
}

async function loadLand(roadName) {
  clearLand();
  if (roadName === "") {
    return;
  }

  setBusy(true);
  setStatus("Loading land along " + roadName + "…");
  try {
    const roadPieces = [];
    for (const road of areaRoads) {
      if (road.attributes.name === roadName) {
        roadPieces.push(road.geometry);
      }
    }
    const roadLine = unionOperator.executeMany(roadPieces);
    chosenRoadLine = roadLine;

    landGraphics.add(new Graphic({ geometry: roadLine, symbol: CHOSEN_ROAD_SYMBOL }));

    const propertyResult = await askAlongRoad(propertiesLayer, roadLine, ["StreetName", "HouseNumber"]);
    const parcelResult = await askAlongRoad(parcelsLayer, roadLine, ["appellation"]);

    const start = roadNameStart(roadName);
    const ownProperties = [];
    const otherProperties = [];
    for (const property of propertyResult.features) {
      if (property.attributes.ValuationReference === "Road") {
        continue; 
      }
      if (isOnRoad(property.attributes.StreetName, start)) {
        ownProperties.push(property);
      } else {
        otherProperties.push(property);
      }
    }
    properties = ownProperties.concat(otherProperties);
    ownPropertyCount = ownProperties.length;

    const ownValuationNumbers = [];
    for (const property of ownProperties) {
      ownValuationNumbers.push(property.attributes.ValuationReference);
    }
    const ownParcels = [];
    const otherParcels = [];
    for (const parcel of parcelResult.features) {
      if (parcel.attributes.parcel_intent === "Road") {
        continue;
      }
      const valuationNumber = parcel.attributes.Val_Ref;
      if (valuationNumber && ownValuationNumbers.includes(valuationNumber)) {
        ownParcels.push(parcel);
      } else {
        otherParcels.push(parcel);
      }
    }
    parcels = ownParcels.concat(otherParcels);
    ownParcelCount = ownParcels.length;

    for (const property of properties) {
      property.symbol = PROPERTY_SYMBOL;
      landGraphics.add(property);
    }
    for (const parcel of parcels) {
      parcel.symbol = PARCEL_SYMBOL;
      landGraphics.add(parcel);
    }

    await zoomTo(roadLine);
    fillLandList();

    let message = properties.length + " properties and " + parcels.length + " parcels found. Pick a land.";
    if (propertyResult.exceededTransferLimit || parcelResult.exceededTransferLimit) {
      message = message + " Showing the first 1,000 lots only.";
    }
    setStatus(message);
  } catch (error) {
    console.error(error);
    roadSelect.value = "";
    setStatus("Could not load the land. Check your internet and pick the road again.");
  } finally {
    setBusy(false);
  }
}

async function pickSearchedRoad(event) {
  const road = event.result.feature.attributes;

  districtSelect.value = road.territorial_authority;
  if (districtSelect.value === "") {
    setStatus("Could not open " + road.name + ". Pick it from the lists.");
    return;
  }
  await loadAreas(districtSelect.value);

  areaSelect.value = road.locality;
  if (areaSelect.value === "") {
    setStatus("Could not open " + road.name + ". Pick it from the lists.");
    return;
  }
  await loadRoads(areaSelect.value);

  roadSelect.value = road.name;
  if (roadSelect.value === "") {
    setStatus("Could not open " + road.name + ". Pick it from the lists.");
    return;
  }
  await loadLand(roadSelect.value);
}

function showParcels() {
  return parcelsRadio.checked;
}

function currentLandList() {
  if (showParcels()) {
    return parcels;
  }
  return properties;
}

function landName(land) {
  const a = land.attributes;
  if (showParcels()) {
    const name = a.appellation || "Parcel " + a.id;
    return name + " · " + formatArea(a.calc_area);
  }
  let name = a.LegalDescription || "No legal description";
  if (a.HouseNumber && a.StreetName) {
    name = a.HouseNumber + (a.HouseNumberExtension || "") + " " + a.StreetName + " · " + name;
  }
  return name + " · " + formatArea(a.Hectares * 10000);
}

function fillLandList() {
  clearChosen();
  resetSelect(landSelect, "Pick a land");

  let list = properties;
  let ownCount = ownPropertyCount;
  if (showParcels()) {
    list = parcels;
    ownCount = ownParcelCount;
  }

  for (let i = 0; i < list.length; i++) {
    if (i === ownCount) {
      addOption(landSelect, "", "── Other lots nearby ──");
      landSelect.lastChild.disabled = true;
    }
    addOption(landSelect, i, landName(list[i]));
  }
  landSelect.disabled = list.length === 0;
}



async function showLand(index) {
  clearChosen();
  if (index === "") {
    return;
  }
  const land = currentLandList()[Number(index)];
  await showChosenLand(land);
}

async function showChosenLand(land) {
  chosenGraphics.add(new Graphic({ geometry: land.geometry, symbol: CHOSEN_LAND_SYMBOL }));

  drawSideLabels(land.geometry);
  const gap = drawRoadGap(land.geometry);

  zoomTo(land.geometry.extent.clone().expand(2));

  const address = await loadAddress(land.geometry);
  openLandPopup(land, address, gap);
}

function drawSideLabels(landShape) {
  for (const ring of landShape.rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const side = new Polyline({
        paths: [[ring[i], ring[i + 1]]],
        spatialReference: landShape.spatialReference
      });

      const length = geodeticLengthOperator.execute(side, { unit: "meters" });

      chosenGraphics.add(new Graphic({
        geometry: centroidOperator.execute(side),
        symbol: {
          type: "text",
          text: length.toFixed(2) + " m",
          color: [20, 20, 20],
          haloColor: [255, 255, 255],
          haloSize: 2,
          font: { size: 12, weight: "bold" }
        }
      }));
    }
  }
}

function drawRoadGap(landShape) {
  if (chosenRoadLine === null) {
    return null;
  }

  let bestCorner = null;
  let bestRoadPoint = null;
  let bestDistance = Infinity;
  for (const ring of landShape.rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const corner = new Point({
        x: ring[i][0],
        y: ring[i][1],
        spatialReference: landShape.spatialReference
      });
      const nearest = proximityOperator.getNearestCoordinate(chosenRoadLine, corner);
      if (nearest.distance < bestDistance) {
        bestDistance = nearest.distance;
        bestCorner = corner;
        bestRoadPoint = nearest.coordinate;
      }
    }
  }

  const gapLine = new Polyline({
    paths: [[[bestCorner.x, bestCorner.y], [bestRoadPoint.x, bestRoadPoint.y]]],
    spatialReference: landShape.spatialReference
  });
  const gap = geodeticLengthOperator.execute(gapLine, { unit: "meters" });

  chosenGraphics.add(new Graphic({ geometry: gapLine, symbol: ROAD_GAP_SYMBOL }));
  chosenGraphics.add(new Graphic({
    geometry: centroidOperator.execute(gapLine),
    symbol: {
      type: "text",
      text: gap.toFixed(2) + " m to road",
      color: [20, 20, 20],
      haloColor: [255, 255, 255],
      haloSize: 2,
      font: { size: 12, weight: "bold" }
    }
  }));

  return gap;
}

async function loadAddress(landShape) {
  setBusy(true);
  setStatus("Looking for the address…");
  let address = "";
  try {
    const result = await addressLayer.queryFeatures({
      geometry: landShape,
      spatialRelationship: "intersects",
      outFields: ["full_address"],
      returnGeometry: true,
      outSpatialReference: view.spatialReference
    });

    if (result.features.length === 0) {
      addressText.textContent = "No address found";
      setStatus("No address point inside this land.");
    } else {
      for (const point of result.features) {
        point.symbol = ADDRESS_SYMBOL;
        chosenGraphics.add(point);
      }
      address = result.features[0].attributes.full_address;
      addressText.textContent = address;
      if (result.features.length > 1) {
        addressText.textContent = address + " (+" + (result.features.length - 1) + " more)";
      }
      setStatus("Done. The side lengths are on the map.");
    }
  } catch (error) {
    console.error(error);
    landSelect.value = "";
    setStatus("Could not load the address. Pick the land again.");
  } finally {
    setBusy(false);
  }
  return address;
}


function openLandPopup(land, address, gap) {
  const a = land.attributes;
  let title = "";
  let band = "";
  let rows = [];
  let record = null;

  if (showParcels()) {
    title = address || a.appellation || "Parcel";
    band =
      "<div>" +
      "<div class='popup-label'>Survey area</div>" +
      "<div class='popup-big'>" + formatArea(a.survey_area) + "</div>" +
      "<div class='popup-small'>" + formatHectares(a.survey_area) + "</div>" +
      "</div>";
    rows = [
      ["Legal name", a.appellation],
      ["Title", a.titles],
      ["Land district", a.land_district],
      ["Parcel type", a.parcel_intent]
    ];
    record = makeSavedParcel(land, address);
  } else {
    title = address || a.LegalDescription || "Property";
    band =
      "<div>" +
      "<div class='popup-label'>Capital value</div>" +
      "<div class='popup-big'>" + formatMoney(a.CapitalValue) + "</div>" +
      "<div class='popup-small'>Land " + formatMoney(a.LandValue) + "</div>" +
      "</div>" +
      "<div>" +
      "<div class='popup-label'>Area</div>" +
      "<div class='popup-big'>" + formatArea(a.Hectares * 10000) + "</div>" +
      "<div class='popup-small'>" + formatHectares(a.Hectares * 10000) + "</div>" +
      "</div>";
    rows = [
      ["Legal description", a.LegalDescription],
      ["Title", a.CertificateOfTitle],
      ["Valuation number", a.ValuationReference],
      ["Council", a.RatingAuthority]
    ];
    record = makeSavedLand(land);
  }

  if (gap !== null) {
    rows.push(["Gap to road", gap.toFixed(2) + " m"]);
  }

  let table = "<table class='popup-facts'>";
  for (const row of rows) {
    table = table + "<tr><th>" + row[0] + "</th><td>" + (row[1] || "-") + "</td></tr>";
  }
  table = table + "</table>";

  const centre = labelPointOperator.execute(land.geometry);
  const centreInMetres = projectOperator.execute(centre, { wkid: 2193 });

  const content = document.createElement("div");
  content.innerHTML =
    "<div class='popup-band'>" + band + "</div>" +
    table +
    "<div class='popup-centre'>Centre (NZTM, m): X " + centreInMetres.x.toFixed(2) + ", Y " + centreInMetres.y.toFixed(2) + "</div>" +
    "<div class='popup-save'>" +
    "<button type='button'>Save this land</button>" +
    "<div class='popup-message'></div>" +
    "</div>";

  const button = content.querySelector("button");
  const message = content.querySelector(".popup-message");
  button.addEventListener("click", function () {
    saveOneLand(record, button, message);
  });

  view.openPopup({
    title: title,
    content: content,
    location: centre
  });
}

function makeSavedLand(property) {
  const a = property.attributes;

  let address = a.StreetName;
  if (a.HouseNumber && a.StreetName) {
    address = a.HouseNumber + (a.HouseNumberExtension || "") + " " + a.StreetName;
  }

  let areaM2 = null;
  if (a.Hectares) {
    areaM2 = Math.round(a.Hectares * 10000 * 10) / 10;
  }

  return {
    key: "property-" + a.OBJECTID,
    fields: {
      address: address,
      legalDescription: a.LegalDescription,
      title: a.CertificateOfTitle,
      valuationNumber: a.ValuationReference,
      landValue: a.LandValue,
      capitalValue: a.CapitalValue,
      areaM2: areaM2,
      council: a.RatingAuthority
    }
  };
}

function makeSavedParcel(parcel, address) {
  const a = parcel.attributes;
  return {
    key: "parcel-" + a.id,
    fields: {
      address: address,
      legalName: a.appellation,
      title: a.titles,
      surveyAreaM2: a.survey_area,
      landDistrict: a.land_district,
      parcelType: a.parcel_intent
    }
  };
}

async function sendLands(lands) {
  const response = await fetch(SAVE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lands)
  });
  if (!response.ok) {
    throw new Error("The server answered " + response.status);
  }
  return await response.json();
}

async function saveOneLand(record, button, message) {
  button.disabled = true;
  button.textContent = "Saving…";
  message.className = "popup-message";
  message.textContent = "";
  try {
    const result = await sendLands([record]);
    button.className = "saved";
    button.textContent = "✓ Saved";
    if (result.added > 0) {
      message.textContent = "Added to lands.json.";
    } else {
      message.textContent = "Updated in lands.json.";
    }
  } catch (error) {
    console.error(error);
    button.disabled = false;
    button.textContent = "Save this land";
    message.className = "popup-message bad";
    message.textContent = "Could not save. Is the Otago Lands API running?";
  }
}

async function saveLands() {
  const lands = [];
  for (const property of properties) {
    lands.push(makeSavedLand(property));
  }

  setBusy(true);
  setStatus("Saving " + lands.length + " lands…");
  try {
    const result = await sendLands(lands);
    setStatus("Saved: " + result.added + " new, " + result.updated + " updated.");
  } catch (error) {
    console.error(error);
    setStatus("Could not save the lands. Is the Otago Lands API running?");
  } finally {
    setBusy(false);
  }
}

function landSymbol(land) {
  if (parcels.includes(land)) {
    return PARCEL_SYMBOL;
  }
  return PROPERTY_SYMBOL;
}

function addToMerge() {
  if (landSelect.value === "") {
    setStatus("Pick a land first, then press Add to merge.");
    return;
  }
  const land = currentLandList()[Number(landSelect.value)];
  if (landsToMerge.includes(land)) {
    setStatus("This land is already in the merge list.");
    return;
  }
  landsToMerge.push(land);
  land.symbol = MERGE_SYMBOL;
  fillMergeList();
  setStatus("Lands in the merge list: " + landsToMerge.length + ".");
}

function fillMergeList() {
  mergeList.innerHTML = "";
  for (let i = 0; i < landsToMerge.length; i++) {
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "✕";
    removeButton.title = "Remove land " + (i + 1);
    removeButton.addEventListener("click", function () {
      removeFromMerge(i);
    });

    const row = document.createElement("tr");
    addCell(row, String(i + 1));
    addCell(row, landName(landsToMerge[i]));
    addCell(row, removeButton);
    mergeList.appendChild(row);
  }
  mergeTable.hidden = landsToMerge.length === 0;
}

function removeFromMerge(index) {
  const land = landsToMerge[index];
  land.symbol = landSymbol(land);
  landsToMerge.splice(index, 1);
  fillMergeList();
  setStatus("Land removed from the merge list.");
}

function clearMergeList() {
  for (const land of landsToMerge) {
    land.symbol = landSymbol(land);
  }
  landsToMerge = [];
  fillMergeList();
}

function switchLandKind() {
  clearMergeList();
  fillLandList();
}

function touchesGroup(land, group) {
  for (const other of group) {
    const gap = distanceOperator.execute(land.geometry, other.geometry, { unit: "meters" });
    if (gap < TOUCH_GAP) {
      return true;
    }
  }
  return false;
}

function landsTouch(lands) {
  const group = [lands[0]];
  let grew = true;
  while (grew) {
    grew = false;
    for (const land of lands) {
      if (!group.includes(land) && touchesGroup(land, group)) {
        group.push(land);
        grew = true;
      }
    }
  }
  return group.length === lands.length;
}

function addUp(lands, field) {
  let total = 0;
  let found = false;
  for (const land of lands) {
    const value = land.attributes[field];
    if (typeof value === "number") {
      total = total + value;
      found = true;
    }
  }
  if (!found) {
    return null;
  }
  return total;
}

function removeMergedLand(land) {
  landGraphics.remove(land);
  if (parcels.includes(land)) {
    const index = parcels.indexOf(land);
    parcels.splice(index, 1);
    if (index < ownParcelCount) {
      ownParcelCount = ownParcelCount - 1;
    }
  } else {
    const index = properties.indexOf(land);
    properties.splice(index, 1);
    if (index < ownPropertyCount) {
      ownPropertyCount = ownPropertyCount - 1;
    }
  }
}

async function mergeLands() {
  if (landsToMerge.length < 2) {
    setStatus("Add at least 2 lands to merge.");
    return;
  }
  if (!landsTouch(landsToMerge)) {
    setStatus("These lands don't all touch. Remove the land that sits apart.");
    return;
  }

  const first = landsToMerge[0];
  const others = landsToMerge.slice(1);
  const count = landsToMerge.length;

  const shapes = [];
  for (const land of landsToMerge) {
    shapes.push(land.geometry);
  }

  if (parcels.includes(first)) {
    first.attributes.survey_area = addUp(landsToMerge, "survey_area");
    first.attributes.calc_area = addUp(landsToMerge, "calc_area");
  } else {
    first.attributes.LandValue = addUp(landsToMerge, "LandValue");
    first.attributes.CapitalValue = addUp(landsToMerge, "CapitalValue");
    first.attributes.Hectares = addUp(landsToMerge, "Hectares");
  }
  first.geometry = unionOperator.executeMany(shapes);

  clearMergeList();
  for (const land of others) {
    removeMergedLand(land);
  }

  fillLandList();
  const index = currentLandList().indexOf(first);
  landSelect.value = index;
  await showLand(index);
  setStatus(count + " lands merged into one. The side lengths are on the map.");
}



function startAdding() {
  adding = true;
  view.container.style.cursor = "crosshair";
  setStatus("Click the map to add points.");
}

function addPoint(event) {
  drawnPoints.push(event.mapPoint);
  drawPointMarkers();
  fillPointList();
  setStatus("Point " + drawnPoints.length + " added.");
}

function drawPointMarkers() {
  drawGraphics.removeAll();
  for (let i = 0; i < drawnPoints.length; i++) {
    drawGraphics.add(new Graphic({ geometry: drawnPoints[i], symbol: PICKED_POINT_SYMBOL }));
    drawGraphics.add(new Graphic({
      geometry: drawnPoints[i],
      symbol: {
        type: "text",
        text: String(i + 1),
        color: [0, 90, 200],
        haloColor: [255, 255, 255],
        haloSize: 2,
        yoffset: 12,
        font: { size: 12, weight: "bold" }
      }
    }));
  }
}

function addCell(row, content) {
  const cell = document.createElement("td");
  cell.append(content);
  row.appendChild(cell);
}

function makeNumberBox(value, label) {
  const box = document.createElement("input");
  box.type = "number";
  box.step = "any";
  box.value = value.toFixed(6);
  box.title = label;
  return box;
}

function fillPointList() {
  pointList.innerHTML = "";
  for (let i = 0; i < drawnPoints.length; i++) {
    const latBox = makeNumberBox(drawnPoints[i].latitude, "Latitude of point " + (i + 1));
    const lngBox = makeNumberBox(drawnPoints[i].longitude, "Longitude of point " + (i + 1));
    latBox.addEventListener("change", function () {
      movePoint(i, latBox, lngBox);
    });
    lngBox.addEventListener("change", function () {
      movePoint(i, latBox, lngBox);
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "✕";
    removeButton.title = "Remove point " + (i + 1);
    removeButton.addEventListener("click", function () {
      removePoint(i);
    });

    const row = document.createElement("tr");
    addCell(row, String(i + 1));
    addCell(row, latBox);
    addCell(row, lngBox);
    addCell(row, removeButton);
    pointList.appendChild(row);
  }
  pointTable.hidden = drawnPoints.length === 0;
}

function movePoint(index, latBox, lngBox) {
  const latitude = Number(latBox.value);
  const longitude = Number(lngBox.value);
  if (latBox.value === "" || lngBox.value === "" || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    latBox.value = drawnPoints[index].latitude.toFixed(6);
    lngBox.value = drawnPoints[index].longitude.toFixed(6);
    setStatus("Latitude goes from -90 to 90, longitude from -180 to 180. Did you swap them?");
    return;
  }

  drawnPoints[index] = new Point({ latitude: latitude, longitude: longitude });
  drawPointMarkers();
  setStatus("Point " + (index + 1) + " moved.");
}

function removePoint(index) {
  drawnPoints.splice(index, 1);
  drawPointMarkers();
  fillPointList();
  setStatus("Point removed.");
}

function clearPoints() {
  adding = false;
  view.container.style.cursor = "";
  drawnPoints = [];
  drawGraphics.removeAll();
  fillPointList();
}

function makeShape() {
  if (drawnPoints.length === 1) {
    return drawnPoints[0];
  }

  const corners = [];
  for (const point of drawnPoints) {
    corners.push([point.longitude, point.latitude]);
  }

  if (drawnPoints.length === 2) {
    return new Polyline({ paths: [corners], spatialReference: { wkid: 4326 } });
  }

  corners.push(corners[0]);
  return new Polygon({ rings: [corners], spatialReference: { wkid: 4326 } });
}

async function finishDrawing() {
  adding = false;
  view.container.style.cursor = "";

  if (drawnPoints.length === 0) {
    setStatus("Press Add points and click the map first.");
    return;
  }

  const shape = makeShape();
  drawPointMarkers();
  if (shape.type === "polyline") {
    drawGraphics.graphics.add(new Graphic({ geometry: shape, symbol: DRAWN_LINE_SYMBOL }), 0);
  }
  if (shape.type === "polygon") {
    drawGraphics.graphics.add(new Graphic({ geometry: shape, symbol: DRAWN_SHAPE_SYMBOL }), 0);
  }

  await findLandInShape(shape);
}

function makeGeoJson() {
  const shape = makeShape();
  let geometry = null;

  if (shape.type === "point") {
    geometry = { type: "Point", coordinates: [shape.longitude, shape.latitude] };
  }
  if (shape.type === "polyline") {
    geometry = { type: "LineString", coordinates: shape.paths[0] };
  }
  if (shape.type === "polygon") {
    const ring = shape.rings[0];
    if (!shape.isClockwise(ring)) {
      ring.reverse();
    }
    geometry = { type: "Polygon", coordinates: [ring] };
  }

  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: { name: "My drawing", points: drawnPoints.length },
      geometry: geometry
    }]
  };
}

async function downloadShape() {
  if (drawnPoints.length === 0) {
    setStatus("Press Add points and click the map first.");
    return;
  }

  try {
    const zipFile = await shpwrite.zip(makeGeoJson(), {
      outputType: "blob",
      types: { point: "my-drawing", polyline: "my-drawing", polygon: "my-drawing" }
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipFile);
    link.download = "my-drawing.zip";
    link.click();
    setStatus("Your drawing was saved as my-drawing.zip.");
  } catch (error) {
    console.error(error);
    setStatus("Could not make the shapefile. Try again.");
  }
}

async function askInShape(layer, shape, where, orderByFields) {
  const result = await layer.queryFeatures({
    geometry: shape,
    spatialRelationship: "intersects",
    where: where,
    outFields: ["*"],
    returnGeometry: true,
    orderByFields: orderByFields,
    outSpatialReference: view.spatialReference
  });
  return result;
}

async function findLandInShape(shape) {
  roadSelect.value = "";
  clearLand();

  setBusy(true);
  setStatus("Looking for land in the shape…");
  try {
    const propertyResult = await askInShape(propertiesLayer, shape, "ValuationReference <> 'Road'", ["StreetName", "HouseNumber"]);
    const parcelResult = await askInShape(parcelsLayer, shape, "parcel_intent <> 'Road'", ["appellation"]);

    properties = propertyResult.features;
    parcels = parcelResult.features;
    ownPropertyCount = properties.length;
    ownParcelCount = parcels.length;

    for (const property of properties) {
      property.symbol = PROPERTY_SYMBOL;
      landGraphics.add(property);
    }
    for (const parcel of parcels) {
      parcel.symbol = PARCEL_SYMBOL;
      landGraphics.add(parcel);
    }
    fillLandList();

    if (shape.type === "point") {
      if (currentLandList().length > 0) {
        landSelect.value = "0";
        await showLand("0");
      } else {
        zoomTo({ target: shape, zoom: 17 });
        setStatus("No land at this point. Roads are left out.");
      }
      return;
    }

    zoomTo(shape.extent.clone().expand(1.5));
    let message = properties.length + " properties and " + parcels.length + " parcels found. Pick a land.";
    if (propertyResult.exceededTransferLimit || parcelResult.exceededTransferLimit) {
      message = message + " Showing the first 1,000 lots only.";
    }
    setStatus(message);
  } catch (error) {
    console.error(error);
    setStatus("Could not look for the land. Check your internet and try again.");
  } finally {
    setBusy(false);
  }
}

function makeArcgisShape(geometry) {
  if (!geometry) {
    return null;
  }
  const wgs84 = { wkid: 4326 };
  const c = geometry.coordinates;

  if (geometry.type === "Point") {
    return new Point({ x: c[0], y: c[1], spatialReference: wgs84 });
  }
  if (geometry.type === "MultiPoint") {
    return new Multipoint({ points: c, spatialReference: wgs84 });
  }
  if (geometry.type === "LineString") {
    return new Polyline({ paths: [c], spatialReference: wgs84 });
  }
  if (geometry.type === "MultiLineString") {
    return new Polyline({ paths: c, spatialReference: wgs84 });
  }
  if (geometry.type === "Polygon") {
    return new Polygon({ rings: c, spatialReference: wgs84 });
  }
  if (geometry.type === "MultiPolygon") {
    const rings = [];
    for (const polygon of c) {
      for (const ring of polygon) {
        rings.push(ring);
      }
    }
    return new Polygon({ rings: rings, spatialReference: wgs84 });
  }
  return null;
}

function isLatLng(shape) {
  let box = shape.extent;
  if (shape.type === "point") {
    box = { xmin: shape.x, xmax: shape.x, ymin: shape.y, ymax: shape.y };
  }
  return box.xmin >= -180 && box.xmax <= 180 && box.ymin >= -90 && box.ymax <= 90;
}

function fileSymbol(shape) {
  if (shape.type === "polygon") {
    return FILE_SHAPE_SYMBOL;
  }
  if (shape.type === "polyline") {
    return FILE_LINE_SYMBOL;
  }
  return FILE_POINT_SYMBOL;
}

function clearFile() {
  fileShape = null;
  fileGraphics.removeAll();
  findFileButton.disabled = true;
}

async function readShapefile() {
  clearFile();
  const file = fileInput.files[0];
  if (!file) {
    return;
  }

  setBusy(true);
  setStatus("Reading " + file.name + "…");
  try {
    const buffer = await file.arrayBuffer();
    let collections = await shp(buffer);
    if (!Array.isArray(collections)) {
      collections = [collections];
    }

    const shapes = [];
    for (const collection of collections) {
      for (const feature of collection.features) {
        const shape = makeArcgisShape(feature.geometry);
        if (shape) {
          shapes.push(shape);
        }
      }
    }

    if (shapes.length === 0) {
      setStatus("No shapes found in " + file.name + ".");
      return;
    }
    for (const shape of shapes) {
      if (shape.type !== shapes[0].type) {
        setStatus("This zip mixes points, lines and shapes. Upload one kind at a time.");
        return;
      }
    }

    const allShapes = unionOperator.executeMany(shapes);
    if (!isLatLng(allShapes)) {
      setStatus("The map can't tell where these shapes go. Check that the zip has a .prj file.");
      return;
    }

    fileShape = allShapes;
    fileGraphics.add(new Graphic({ geometry: fileShape, symbol: fileSymbol(fileShape) }));
    if (fileShape.type === "point") {
      zoomTo({ target: fileShape, zoom: 17 });
    } else {
      zoomTo(fileShape.extent.clone().expand(1.5));
    }
    setStatus("Shapes in " + file.name + ": " + shapes.length + ". Press Find land.");
  } catch (error) {
    console.error(error);
    setStatus("Could not read " + file.name + ". Is it a zipped shapefile?");
  } finally {
    setBusy(false);
  }
}

async function findLandInFile() {
  if (fileShape === null) {
    setStatus("Pick a shapefile first.");
    return;
  }
  await findLandInShape(fileShape);
}

async function clickLand(event) {
  if (isBusy) {
    return;
  }
  const response = await view.hitTest(event, { include: [landGraphics] });
  const list = currentLandList();
  for (const result of response.results) {
    const index = list.indexOf(result.graphic);
    if (index !== -1) {
      landSelect.value = index;
      await showLand(index);
      return;
    }
  }
}

function onMapClick(event) {
  if (adding) {
    addPoint(event);
  } else {
    clickLand(event);
  }
}

function resetAll() {
  clearPoints();
  clearFile();
  fileInput.value = "";
  roadSearch.clear();

  districtSelect.value = "";
  resetSelect(areaSelect, "Pick an area");
  clearRoads();

  zoomTo({ center: [169.6, -45.3], zoom: 7 });
  setStatus("Pick a district to start.");
}


districtSelect.addEventListener("change", function () {
  loadAreas(districtSelect.value);
});
areaSelect.addEventListener("change", async function () {
  await loadRoads(areaSelect.value);
  if (areaRoads.length > 0) {
    zoomTo(areaRoads);
  }
});
roadSelect.addEventListener("change", function () {
  loadLand(roadSelect.value);
});
roadSearch.on("select-result", pickSearchedRoad);
propertiesRadio.addEventListener("change", switchLandKind);
parcelsRadio.addEventListener("change", switchLandKind);
landSelect.addEventListener("change", function () {
  showLand(landSelect.value);
});
saveButton.addEventListener("click", saveLands);
addMergeButton.addEventListener("click", addToMerge);
mergeButton.addEventListener("click", mergeLands);
addButton.addEventListener("click", startAdding);
finishButton.addEventListener("click", finishDrawing);
downloadButton.addEventListener("click", downloadShape);
fileInput.addEventListener("change", readShapefile);
findFileButton.addEventListener("click", findLandInFile);
view.on("click", onMapClick);

resetSelect(areaSelect, "Pick an area");
resetSelect(roadSelect, "Pick a road");
resetSelect(landSelect, "Pick a land");
fillDistricts();
