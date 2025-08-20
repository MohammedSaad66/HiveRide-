// ✅ Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyC955U9CGs0-aAcS0hgSFQgvDlwOK1SRnA",
    authDomain: "flutter-bus-hiveride.firebaseapp.com",
    databaseURL: "https://flutter-bus-hiveride-default-rtdb.firebaseio.com",
    projectId: "flutter-bus-hiveride",
    storageBucket: "flutter-bus-hiveride.firebasestorage.app",
    messagingSenderId: "185743407069",
    appId: "1:185743407069:web:7b9c33f8e25b8966d62834"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// --- 🌐 MAP & TRACKING FUNCTIONS ---
let map;
let busMarkers = {}; // Object to store markers for each bus

/**
 * Initializes the Leaflet map.
 * Avoids re-initializing if the map already exists.
 */
function initMap() {
    if (map) return;
    map = L.map('map').setView([12.9165, 79.1325], 12); // Centered on Vellore, India
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

/**
 * Listens for bus location updates from Firebase and updates the map.
 */
function trackAllBuses() {
    const busesRef = db.ref("buses");
    busesRef.on("value", snapshot => {
        const buses = snapshot.val();
        if (!buses) return;
        for (let busId in buses) {
            const {
                latitude,
                longitude
            } = buses[busId];
            updateBusMarker(busId, latitude, longitude);
        }
    });
}

/**
 * Adds a new bus marker to the map or moves an existing one.
 */
function updateBusMarker(busId, lat, lng) {
    if (busMarkers[busId]) {
        busMarkers[busId].setLatLng([lat, lng]); // Move existing marker
    } else {
        busMarkers[busId] = L.marker([lat, lng]).addTo(map)
            .bindPopup(`<b>Bus: ${busId}</b>`);
    }
}


// --- 👤 AUTHENTICATION FUNCTIONS ---

/**
 * Toggles the view between the Register and Login forms.
 */
function toggleAuth() {
    const reg = document.getElementById("register-section");
    const log = document.getElementById("login-section");
    reg.style.display = reg.style.display === "none" ? "block" : "none";
    log.style.display = log.style.display === "none" ? "block" : "none";
}

/**
 * Registers a new user with email, password, and role.
 */
function register() {
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const role = document.getElementById("reg-role").value;
    auth.createUserWithEmailAndPassword(email, password).then(cred => {
        return db.ref("users/" + cred.user.uid).set({
            email,
            role
        });
    }).catch(error => alert(error.message));
}

/**
 * Logs in an existing user with email and password.
 */
function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    auth.signInWithEmailAndPassword(email, password).catch(error => alert(error.message));
}

/**
 * Initiates Google Sign-In and sets the user's role to 'student' by default.
 */
function googleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(result => {
        const user = result.user;
        db.ref("users/" + user.uid).set({
            email: user.email,
            role: "student"
        });
    }).catch(error => alert("Google Sign-in error: " + error.message));
}

/**
 * Logs out the currently signed-in user.
 */
function logout() {
    auth.signOut();
}


// --- 🚗 DRIVER FUNCTIONS ---

/**
 * Gets the driver's geolocation and sends it to Firebase continuously.
 */
function sendLocation() {
    const busNo = document.getElementById("busNumber").value;
    if (!busNo) {
        return alert("Bus number not assigned. Please contact admin.");
    }

    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            position => {
                const {
                    latitude,
                    longitude
                } = position.coords;
                db.ref("buses/" + busNo).set({
                    latitude,
                    longitude
                });
                document.getElementById("location-status").innerText =
                    `✅ Location sent for ${busNo} at ${new Date().toLocaleTimeString()}`;
            },
            error => {
                document.getElementById("location-status").innerText =
                    `Error: ${error.message}`;
            }, {
                enableHighAccuracy: true
            }
        );
    } else {
        alert("Geolocation is not available in your browser.");
    }
}


// --- 👨‍🎓 STUDENT & GENERAL FUNCTIONS ---

/**
 * Loads the list of buses into the dropdown selector for students.
 */
function loadBusList() {
    db.ref("busDetails").once("value", snap => {
        const selector = document.getElementById("bus-selector");
        selector.innerHTML = '<option value="">Select a bus to view</option>';
        snap.forEach(child => {
            const option = document.createElement("option");
            option.value = child.key;
            option.text = `${child.key} - ${child.val().route}`;
            selector.appendChild(option);
        });
    });
}

/**
 * Shows the details of the bus selected from the dropdown.
 */
function showBusDetails() {
    const busNo = document.getElementById("bus-selector").value;
    if (!busNo) {
        document.getElementById("bus-info").innerHTML = "";
        return;
    }
    db.ref("busDetails/" + busNo).once("value", snap => {
        const info = snap.val();
        document.getElementById("bus-info").innerHTML = `
      <p><b>Bus:</b> ${busNo}</p>
      <p><b>Route:</b> ${info.route}</p>
      <p><b>Driver:</b> ${info.driverName}</p>
      <p><b>Phone:</b> ${info.driverPhone}</p>
    `;
    });
}

// Event listener for the bus selector dropdown.
document.getElementById("bus-selector").addEventListener("change", function() {
    let selectedBus = this.value;
    showBusDetails();
    if (selectedBus && busMarkers[selectedBus]) {
        map.setView(busMarkers[selectedBus].getLatLng(), 15); // Zoom to bus
        busMarkers[selectedBus].openPopup();
    }
});


// --- ⚙️ ADMIN FUNCTIONS ---

/**
 * Edits the details for a specific bus in Firebase.
 */
function editBusDetails() {
    const busNo = document.getElementById("bus-edit-number").value;
    const route = document.getElementById("bus-edit-route").value;
    const name = document.getElementById("bus-edit-driver").value;
    const phone = document.getElementById("bus-edit-phone").value;
    if (busNo && route && name && phone) {
        db.ref("busDetails/" + busNo).set({
            route: route,
            driverName: name,
            driverPhone: phone
        });
        alert("Bus details updated successfully.");
    } else {
        alert("Please fill all bus detail fields.");
    }
}

/**
 * Adds a new, detailed schedule entry to Firebase.
 */
function addSchedule() {
    const busNo = document.getElementById("bus-no").value;
    const route = document.getElementById("bus-route").value;
    const morning = document.getElementById("morning-time").value;
    const evening = document.getElementById("evening-time").value;
    const driver = document.getElementById("driver-name").value;
    const mobile = document.getElementById("driver-mobile").value;

    if (!busNo || !route || !morning || !evening || !driver || !mobile) {
        alert("⚠️ Please fill all fields!");
        return;
    }

    db.ref("schedule").push().set({
        busNo,
        route,
        morning,
        evening,
        driver,
        mobile
    }).then(() => {
        alert("Schedule added successfully!");
        // Clear input fields after successful submission
        document.getElementById("bus-no").value = "";
        document.getElementById("bus-route").value = "";
        document.getElementById("morning-time").value = "";
        document.getElementById("evening-time").value = "";
        document.getElementById("driver-name").value = "";
        document.getElementById("driver-mobile").value = "";
    });
}

/**
 * Loads schedule entries from Firebase into the admin table.
 */
function loadSchedule() {
    const scheduleRef = db.ref("schedule");
    scheduleRef.on("value", (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById("schedule-body");
        tbody.innerHTML = ""; // Clear existing table data

        if (!data) {
            tbody.innerHTML = '<tr><td colspan="7">No schedule data available.</td></tr>';
            return;
        }

        for (let key in data) {
            const item = data[key];
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.busNo}</td>
                <td>${item.route}</td>
                <td>${item.morning}</td>
                <td>${item.evening}</td>
                <td>${item.driver}</td>
                <td>${item.mobile}</td>
                <td>
                    <button onclick="deleteSchedule('${key}')">❌ Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });
}

/**
 * Deletes a specific schedule entry from Firebase.
 */
function deleteSchedule(key) {
    if (confirm("Are you sure you want to delete this schedule entry?")) {
        db.ref("schedule/" + key).remove();
    }
}


// --- 🔥 MAIN APP LOGIC (AUTH STATE CHANGE) ---

/**
 * This is the core function that runs when a user logs in or out.
 * It controls what is visible on the page based on the user's role.
 */
auth.onAuthStateChanged(user => {
    const authSection = document.getElementById("auth-section");
    const dashboard = document.getElementById("dashboard");
    const adminControls = document.getElementById("admin-controls");
    const driverLocation = document.getElementById("driver-location");
    const mapSection = document.getElementById("map-section");
    const studentInfo = document.getElementById("student-info-section");

    if (user) {
        // User is signed in.
        authSection.style.display = "none";
        dashboard.style.display = "block";

        db.ref("users/" + user.uid).once("value").then(snapshot => {
            if (!snapshot.exists()) return;

            const {
                role,
                email
            } = snapshot.val();
            document.getElementById("user-role").innerText = `Role: ${role}`;

            // Hide all role-specific sections initially to prevent flashing content
            adminControls.style.display = "none";
            driverLocation.style.display = "none";
            studentInfo.style.display = "none";
            mapSection.style.display = "none";

            // Show sections based on the user's role
            if (role === "admin") {
                adminControls.style.display = "block";
                mapSection.style.display = "block";
                initMap();
                trackAllBuses();
                loadBusList();
                loadSchedule(); // Loads the detailed schedule table
            } else if (role === "student") {
                studentInfo.style.display = "block";
                mapSection.style.display = "block";
                initMap();
                trackAllBuses();
                loadBusList();
            } else if (role === "driver") {
                driverLocation.style.display = "block";
                // Find the bus assigned to this driver
                db.ref("driverAssignments").orderByValue().equalTo(email).once("value", snap => {
                    if (snap.exists()) {
                        snap.forEach(child => {
                            document.getElementById("driver-bus-no").innerText = `Your Bus: ${child.key}`;
                            document.getElementById("busNumber").value = child.key;
                        });
                    } else {
                        document.getElementById("driver-bus-no").innerText = "No bus assigned.";
                    }
                });
            }
        });
    } else {
        // No user is signed in.
        authSection.style.display = "block";
        dashboard.style.display = "none";
    }
});
      
