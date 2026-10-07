let map;
let userMarker = null;
let currentUserLocation = null;

let streetLayer;
let satelliteLayer;

let parkingData = [];
let drawnPoints = [];
let currentPolygon = null;

let isAdmin = false;
let selectedParkingId = null;


// ===============================
// MAPNI ISHGA TUSHIRISH
// ===============================

document.addEventListener("DOMContentLoaded", function () {

    map = L.map("map").setView([40.423, 71.773], 15);

    streetLayer = L.tileLayer(
        "https://tile.openstreetmap.de/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }
    ).addTo(map);

    satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 19,
            attribution: "Tiles &copy; Esri"
        }
    );

    L.control.layers({
        "Xarita": streetLayer,
        "Sun’iy yo‘ldosh": satelliteLayer
    }).addTo(map);


    // Saqlangan parkinglarni yuklash
    loadSavedParkings();

    // Xarita bosilganda nuqta chizish
    map.on("click", function (e) {

        if (!isAdmin) return;

        if (!currentPolygon) return;

        drawnPoints.push([
            e.latlng.lat,
            e.latlng.lng
        ]);

        currentPolygon.setLatLngs(drawnPoints);
    });

});


// ===============================
// GPS
// ===============================

function getUserLocation() {

    if (!navigator.geolocation) {
        alert("Brauzeringiz GPSni qo‘llab-quvvatlamaydi.");
        return;
    }

    navigator.geolocation.getCurrentPosition(

        function (position) {

            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            currentUserLocation = {
                lat: lat,
                lon: lon
            };

            if (userMarker) {
                map.removeLayer(userMarker);
            }

            userMarker = L.marker([lat, lon])
                .addTo(map)
                .bindPopup("Sizning joylashuvingiz")
                .openPopup();

            map.setView([lat, lon], 16);

            loadNearbyParking(lat, lon);
        },

        function () {
            alert("GPS joylashuvini olishning iloji bo‘lmadi.");
        },

        {
            enableHighAccuracy: true,
            timeout: 15000
        }
    );
}


// ===============================
// PARKINGLARNI SERVERDAN OLISH
// ===============================

async function loadNearbyParking(lat, lon) {

    try {

        const response = await fetch(
            `/api/parking?lat=${lat}&lon=${lon}`
        );

        const data = await response.json();

        if (!Array.isArray(data)) {
            console.log("Parking ma’lumotlari:", data);
            return;
        }

        parkingData = data;

        displayParkingList();

    } catch (error) {

        console.error(error);

        document.getElementById("parkingList").innerHTML =
            "<p>Parking ma’lumotlarini olishda xatolik.</p>";
    }
}


// ===============================
// SAQLANGAN PARKINGLAR
// ===============================

function loadSavedParkings() {

    const saved = localStorage.getItem("gpsParkingData");

    if (!saved) {
        return;
    }

    try {

        const data = JSON.parse(saved);

        data.forEach(function (parking) {

            parkingData.push(parking);

            drawSavedParking(parking);

        });

        displayParkingList();

    } catch (error) {

        console.error(
            "Saqlangan parkinglarni yuklashda xatolik:",
            error
        );

    }
}


// ===============================
// PARKINGNI XARITAGA CHIZISH
// ===============================

function drawSavedParking(parking) {

    if (!parking.points || parking.points.length < 3) {
        return;
    }

    const polygon = L.polygon(
        parking.points,
        {
            color: "#0066ff",
            fillColor: "#3388ff",
            fillOpacity: 0.35
        }
    ).addTo(map);

    polygon.on("click", function () {

        selectedParkingId = parking.id;

        showParkingInfo(parking);

    });

    parking._polygon = polygon;
}


// ===============================
// PARKING MA’LUMOTINI KO‘RSATISH
// ===============================

function showParkingInfo(parking) {

    const total = Number(parking.capacity || 0);

    let free = Number(parking.freeSpots);

    if (isNaN(free)) {
        free = total;
    }

    if (free < 0) {
        free = 0;
    }

    if (free > total) {
        free = total;
    }

    const occupied = total - free;

    const area = Number(parking.area || 0);

    const popupHTML = `
        <div style="min-width:230px">

            <h3 style="margin-top:0">
                ${escapeHtml(parking.name || "Parking")}
            </h3>

            <hr>

            <b>Umumiy sig‘im:</b>
            ${total} ta

            <br><br>

            <b>Bo‘sh joy:</b>
            ${free} ta

            <br><br>

            <b>Band joy:</b>
            ${occupied} ta

            <br><br>

            <b>Maydoni:</b>
            ${area.toFixed(1)} m²

            ${
                isAdmin
                ?
                `
                <hr>

                <label>
                    <b>Bo‘sh joylar:</b>
                </label>

                <input
                    id="freeSpotsInput"
                    type="number"
                    min="0"
                    max="${total}"
                    value="${free}"
                    style="
                        width:100%;
                        box-sizing:border-box;
                        padding:7px;
                        margin-top:5px;
                    "
                >

                <button
                    onclick="updateFreeSpots('${parking.id}')"
                    style="
                        width:100%;
                        margin-top:8px;
                        padding:8px;
                        cursor:pointer;
                    "
                >
                    Bo‘sh joylarni saqlash
                </button>
                `
                :
                ""
            }

        </div>
    `;

    L.popup()
        .setLatLng(
            parking.points
            ? parking.points[0]
            : map.getCenter()
        )
        .setContent(popupHTML)
        .openOn(map);
}


// ===============================
// BO‘SH JOYLARNI YANGILASH
// ===============================

function updateFreeSpots(parkingId) {

    if (!isAdmin) {
        alert("Bu amal faqat admin uchun.");
        return;
    }

    const input =
        document.getElementById("freeSpotsInput");

    if (!input) {
        return;
    }

    const freeSpots = Number(input.value);

    const parking =
        parkingData.find(function (item) {
            return String(item.id) === String(parkingId);
        });

    if (!parking) {
        alert("Parking topilmadi.");
        return;
    }

    const capacity = Number(parking.capacity || 0);

    if (
        !Number.isInteger(freeSpots) ||
        freeSpots < 0 ||
        freeSpots > capacity
    ) {

        alert(
            `Bo‘sh joy 0 dan ${capacity} gacha bo‘lishi kerak.`
        );

        return;
    }

    parking.freeSpots = freeSpots;

    saveParkingData();

    alert("Bo‘sh joylar saqlandi.");

    showParkingInfo(parking);

    displayParkingList();
}


// ===============================
// PARKING RO‘YXATI
// ===============================

function displayParkingList() {

    const list =
        document.getElementById("parkingList");

    if (!list) {
        return;
    }

    if (parkingData.length === 0) {

        list.innerHTML =
            "<p>Hozircha parking topilmadi.</p>";

        return;
    }

    let html = "";

    parkingData.forEach(function (parking) {

        const total =
            Number(parking.capacity || 0);

        let free =
            Number(parking.freeSpots);

        if (isNaN(free)) {
            free = total;
        }

        const occupied =
            total - free;

        html += `
            <div
                onclick="selectParking('${parking.id}')"
                style="
                    border:1px solid #ddd;
                    padding:10px;
                    margin-bottom:8px;
                    border-radius:8px;
                    cursor:pointer;
                    background:#fff;
                "
            >

                <b>
                    ${escapeHtml(
                        parking.name || "Parking"
                    )}
                </b>

                <br>

                Umumiy:
                ${total} ta

                <br>

                Bo‘sh:
                <b>${free} ta</b>

                <br>

                Band:
                <b>${occupied} ta</b>

            </div>
        `;
    });

    list.innerHTML = html;
}


// ===============================
// RO‘YXATDAN PARKING TANLASH
// ===============================

function selectParking(parkingId) {

    const parking =
        parkingData.find(function (item) {
            return String(item.id) === String(parkingId);
        });

    if (!parking) {
        return;
    }

    selectedParkingId = parking.id;

    if (parking.points && parking.points.length > 0) {

        map.fitBounds(parking._polygon.getBounds());

    }

    showParkingInfo(parking);
}


// ===============================
// ADMIN: PARKING CHIZISH
// ===============================

function startDrawingParking() {

    if (!isAdmin) {

        alert("Avval admin sifatida kiring.");

        return;
    }

    drawnPoints = [];

    if (currentPolygon) {

        map.removeLayer(currentPolygon);

    }

    currentPolygon = L.polygon(
        [],
        {
            color: "#ff0000",
            fillColor: "#ff5555",
            fillOpacity: 0.35
        }
    ).addTo(map);

    alert(
        "Endi xaritada parking chegarasining nuqtalarini ketma-ket bosing."
    );
}


// ===============================
// CHIZMANI TUGATISH
// ===============================

function finishDrawingParking() {

    if (!isAdmin) {
        alert("Avval admin sifatida kiring.");
        return;
    }

    if (!currentPolygon || drawnPoints.length < 3) {

        alert(
            "Parking chegarasini kamida 3 ta nuqta bilan chizing."
        );

        return;
    }

    const name =
        prompt("Parking nomini kiriting:");

    if (!name) {
        return;
    }

    const capacityText =
        prompt("Umumiy sig‘imni kiriting:");

    const capacity =
        Number(capacityText);

    if (
        !Number.isInteger(capacity) ||
        capacity <= 0
    ) {

        alert(
            "Sig‘im musbat butun son bo‘lishi kerak."
        );

        return;
    }

    const area =
        calculatePolygonArea(drawnPoints);

    const parking = {

        id:
            Date.now().toString(),

        name:
            name,

        capacity:
            capacity,

        freeSpots:
            capacity,

        area:
            area,

        points:
            drawnPoints

    };

    parkingData.push(parking);

    saveParkingData();

    currentPolygon.setStyle({

        color: "#0066ff",
        fillColor: "#3388ff"

    });

    currentPolygon.on("click", function () {

        selectedParkingId =
            parking.id;

        showParkingInfo(parking);

    });

    parking._polygon =
        currentPolygon;

    currentPolygon = null;

    drawnPoints = [];

    displayParkingList();

    alert(
        "Parking muvaffaqiyatli saqlandi.\n\n" +
        "Boshlang‘ich bo‘sh joylar: " +
        capacity +
        " ta"
    );
}


// ===============================
// CHIZMANI TOZALASH
// ===============================

function clearCurrentDrawing() {

    if (!currentPolygon) {
        return;
    }

    map.removeLayer(currentPolygon);

    currentPolygon = null;

    drawnPoints = [];
}


// ===============================
// PARKINGNI O‘CHIRISH
// ===============================

function deleteSelectedParking() {

    if (!isAdmin) {

        alert("Bu amal faqat admin uchun.");

        return;
    }

    if (!selectedParkingId) {

        alert(
            "Avval parkingni tanlang."
        );

        return;
    }

    const parking =
        parkingData.find(function (item) {

            return String(item.id) ===
                String(selectedParkingId);

        });

    if (!parking) {
        return;
    }

    const confirmDelete =
        confirm(
            `"${parking.name}" parkingini o‘chirmoqchimisiz?`
        );

    if (!confirmDelete) {
        return;
    }

    if (parking._polygon) {

        map.removeLayer(
            parking._polygon
        );

    }

    parkingData =
        parkingData.filter(function (item) {

            return String(item.id) !==
                String(selectedParkingId);

        });

    selectedParkingId = null;

    saveParkingData();

    displayParkingList();

    map.closePopup();
}


// ===============================
// LOCALSTORAGEGA SAQLASH
// ===============================

function saveParkingData() {

    const cleanData =
        parkingData.map(function (parking) {

            return {

                id:
                    parking.id,

                name:
                    parking.name,

                capacity:
                    parking.capacity,

                freeSpots:
                    parking.freeSpots,

                area:
                    parking.area,

                points:
                    parking.points

            };

        });

    localStorage.setItem(
        "gpsParkingData",
        JSON.stringify(cleanData)
    );
}


// ===============================
// MAYDON HISOBLASH
// ===============================

function calculatePolygonArea(points) {

    const earthRadius = 6378137;

    let area = 0;

    for (
        let i = 0;
        i < points.length;
        i++
    ) {

        const p1 =
            points[i];

        const p2 =
            points[
                (i + 1) %
                points.length
            ];

        const lat1 =
            p1[0] *
            Math.PI / 180;

        const lat2 =
            p2[0] *
            Math.PI / 180;

        const lon1 =
            p1[1] *
            Math.PI / 180;

        const lon2 =
            p2[1] *
            Math.PI / 180;

        area +=
            (lon2 - lon1) *
            (
                2 +
                Math.sin(lat1) +
                Math.sin(lat2)
            );
    }

    area =
        Math.abs(area) *
        earthRadius *
        earthRadius /
        2;

    return area;
}


// ===============================
// HTML XAVFSIZLIGI
// ===============================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}


// ===============================
// ADMIN HOLATINI O‘RNATISH
// ===============================

function setAdminMode(value) {

    isAdmin = Boolean(value);

    displayParkingList();

}


// ===============================
// GLOBAL FUNKSIYALAR
// ===============================

window.getUserLocation =
    getUserLocation;

window.startDrawingParking =
    startDrawingParking;

window.finishDrawingParking =
    finishDrawingParking;

window.clearCurrentDrawing =
    clearCurrentDrawing;

window.deleteSelectedParking =
    deleteSelectedParking;

window.selectParking =
    selectParking;

window.updateFreeSpots =
    updateFreeSpots;

window.setAdminMode =
    setAdminMode;