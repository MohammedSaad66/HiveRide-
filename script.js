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
let currentUserRole = null; // Stores the current user's role

// --- 🌐 MAP & TRACKING FUNCTIONS ---
let map;
let busMarkers = {};

function initMap() {
    if (map) return;
    map = L.map('map').setView([12.9165, 79.1325], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

function trackAllBuses() {
    const busesRef = db.ref("buses");
    busesRef.on("value", snapshot => {
        const buses = snapshot.val();
        if (!buses) return;
        for (let busId in buses) {
            const { latitude, longitude } = buses[busId];
            updateBusMarker(busId, latitude, longitude);
        }
    });
}

function updateBusMarker(busId, lat, lng) {
    if (busMarkers[busId]) {
        busMarkers[busId].setLatLng([lat, lng]);
    } else {
        busMarkers[busId] = L.marker([lat, lng]).addTo(map)
            .bindPopup(`<b>Bus: ${busId}</b>`);
    }
}


// --- 👤 AUTHENTICATION FUNCTIONS ---
function toggleAuth() {
    const reg = document.getElementById("register-section");
    const log = document.getElementById("login-section");
    reg.style.display = reg.style.display === "none" ? "block" : "none";
    log.style.display = log.style.display === "none" ? "block" : "none";
}

function register() {
    const email = document.getElementById("reg-email").value;
    const password = document.getElementById("reg-password").value;
    const role = document.getElementById("reg-role").value;
    auth.createUserWithEmailAndPassword(email, password).then(cred => {
        return db.ref("users/" + cred.user.uid).set({ email, role });
    }).catch(error => alert(error.message));
}

function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    auth.signInWithEmailAndPassword(email, password).catch(error => alert(error.message));
}

function googleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(result => {
        const user = result.user;
        db.ref("users/" + user.uid).set({ email: user.email, role: "student" });
    }).catch(error => alert("Google Sign-in error: " + error.message));
}

function logout() {
    auth.signOut();
    currentUserRole = null;
}


// --- 🚗 DRIVER FUNCTIONS ---
function sendLocation() {
    const busNo = document.getElementById("busNumber").value;
    if (!busNo) {
        return alert("Bus number not assigned. Please contact admin.");
    }
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(
            position => {
                const { latitude, longitude } = position.coords;
                db.ref("buses/" + busNo).set({ latitude, longitude });
                document.getElementById("location-status").innerText =
                    `✅ Location sent for ${busNo} at ${new Date().toLocaleTimeString()}`;
            },
            error => {
                document.getElementById("location-status").innerText =
                    `Error: ${error.message}`;
            }, { enableHighAccuracy: true }
        );
    } else {
        alert("Geolocation is not available in your browser.");
    }
}


// --- 👨‍🎓 STUDENT & GENERAL FUNCTIONS ---
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

document.getElementById("bus-selector").addEventListener("change", function() {
    let selectedBus = this.value;
    showBusDetails();
    if (selectedBus && busMarkers[selectedBus]) {
        map.setView(busMarkers[selectedBus].getLatLng(), 15);
        busMarkers[selectedBus].openPopup();
    }
});


// --- ⚙️ ADMIN & SCHEDULE FUNCTIONS ---
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
        busNo, route, morning, evening, driver, mobile
    }).then(() => {
        alert("Schedule added successfully!");
        document.getElementById("bus-no").value = "";
        document.getElementById("bus-route").value = "";
        document.getElementById("morning-time").value = "";
        document.getElementById("evening-time").value = "";
        document.getElementById("driver-name").value = "";
        document.getElementById("driver-mobile").value = "";
    });
}

// ✅ FIX: This function is updated to work for both students and admins.
function loadSchedule() {
    const scheduleRef = db.ref("schedule");
    scheduleRef.on("value", (snapshot) => {
        const data = snapshot.val();
        
        const adminTbody = document.getElementById("schedule-body"); 
        const studentTbody = document.getElementById("schedule-body-student");
        
        if(adminTbody) adminTbody.innerHTML = "";
        if(studentTbody) studentTbody.innerHTML = "";

        if (!data) {
            const noDataHtml = '<tr><td colspan="7">No schedule data available.</td></tr>';
            if(adminTbody) adminTbody.innerHTML = noDataHtml;
            if(studentTbody) studentTbody.innerHTML = noDataHtml;
            return;
        }

        for (let key in data) {
            const item = data[key];
            
            const actionsCell = currentUserRole === 'admin' 
                ? `<td><button onclick="deleteSchedule('${key}')">❌ Delete</button></td>` 
                : '';

            const rowHtmlForAdmin = `
                <td>${item.busNo}</td> <td>${item.route}</td> <td>${item.morning}</td>
                <td>${item.evening}</td> <td>${item.driver}</td> <td>${item.mobile}</td>
                ${actionsCell}`;
            
            const rowHtmlForStudent = `
                <td>${item.busNo}</td> <td>${item.route}</td> <td>${item.morning}</td>
                <td>${item.evening}</td> <td>${item.driver}</td> <td>${item.mobile}</td>`;
            
            if(currentUserRole === 'admin' && adminTbody) {
                const tr = document.createElement("tr");
                tr.innerHTML = rowHtmlForAdmin;
                adminTbody.appendChild(tr);
            }
            if(currentUserRole === 'student' && studentTbody) {
                const tr = document.createElement("tr");
                tr.innerHTML = rowHtmlForStudent;
                studentTbody.appendChild(tr);
            }
        }
    });
}

function deleteSchedule(key) {
    if (confirm("Are you sure you want to delete this schedule entry?")) {
        db.ref("schedule/" + key).remove();
    }
}


// --- 🔥 MAIN APP LOGIC (AUTH STATE CHANGE) ---
auth.onAuthStateChanged(user => {
    const authSection = document.getElementById("auth-section");
    const dashboard = document.getElementById("dashboard");
    const adminControls = document.getElementById("admin-controls");
    const driverLocation = document.getElementById("driver-location");
    const mapSection = document.getElementById("map-section");
    const studentInfo = document.getElementById("student-info-section");

    if (user) {
        authSection.style.display = "none";
        dashboard.style.display = "block";
        db.ref("users/" + user.uid).once("value").then(snapshot => {
            if (!snapshot.exists()) return;

            const { role, email } = snapshot.val();
            currentUserRole = role; 
            document.getElementById("user-role").innerText = `Role: ${role}`;

            adminControls.style.display = "none";
            driverLocation.style.display = "none";
            studentInfo.style.display = "none";
            mapSection.style.display = "none";

            if (role === "admin") {
                adminControls.style.display = "block";
                mapSection.style.display = "block";
                initMap();
                trackAllBuses();
                loadBusList();
                loadSchedule();
            } else if (role === "student") {
                studentInfo.style.display = "block";
                mapSection.style.display = "block";
                initMap();
                trackAllBuses();
                loadBusList();
                loadSchedule(); // ✅ FIX: Added this line to load the schedule for students.
            } else if (role === "driver") {
                driverLocation.style.display = "block";
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
        authSection.style.display = "block";
        dashboard.style.display = "none";
        currentUserRole = null;
    }
});
        
