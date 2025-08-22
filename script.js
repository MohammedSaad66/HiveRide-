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

// --- 🔥 INITIALIZATION ---
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
let currentUserRole = null; // Stores the current user's role globally
let map;
let busMarkers = {};


// --- 🌐 MAP & TRACKING FUNCTIONS ---
function initMap() {
    if (map) return;
    map = L.map('map').setView([12.9165, 79.1325], 12); // Vellore, India coordinates
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
            const {
                latitude,
                longitude
            } = buses[busId];
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
function toggleAuthForms() {
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
        return db.ref("users/" + cred.user.uid).set({
            email,
            role
        });
    }).then(() => {
        alert("Registration successful!");
        toggleAuthForms();
    }).catch(error => alert(error.message));
}

function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            alert(error.message);
        });
}

function googleSignIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(result => {
        const user = result.user;
        // Set new users from Google Sign-In to "student" role by default
        db.ref("users/" + user.uid).set({
            email: user.email,
            role: "student"
        });
    }).catch(error => alert("Google Sign-in error: " + error.message));
}

function logout() {
    auth.signOut();
}


// --- 👨‍🎓 STUDENT & GENERAL FUNCTIONS ---
function loadBusList() {
    db.ref("busDetails").once("value", snap => {
        const selector = document.getElementById("bus-selector");
        selector.innerHTML = '<option value="">Select a bus to view details</option>';
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
      <h4>Bus Information</h4>
      <p><b>Bus Number:</b> ${busNo}</p>
      <p><b>Route:</b> ${info.route}</p>
      <p><b>Driver:</b> ${info.driverName}</p>
      <p><b>Phone:</b> ${info.driverPhone}</p>
    `;
    });
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
                    `✅ Location sent for Bus ${busNo} at ${new Date().toLocaleTimeString()}`;
            },
            error => {
                document.getElementById("location-status").innerText = `Error: ${error.message}`;
            }, { enableHighAccuracy: true }
        );
    } else {
        alert("Geolocation is not available in your browser.");
    }
}


// --- ⚙️ ADMIN FUNCTIONS ---

// Student Management
function saveStudent() {
    const roll = document.getElementById("student-roll").value;
    const name = document.getElementById("student-name").value;
    const route = document.getElementById("student-route").value;
    const year = document.getElementById("student-year").value;
    const balance = document.getElementById("student-balance").value;

    if (!roll || !name || !route || !year || !balance) {
        alert("⚠️ Please fill all student detail fields!");
        return;
    }
    db.ref("students/" + roll).set({
        rollNo: roll,
        name: name,
        route: route,
        year: year,
        balance: balance
    }).then(() => {
        alert("✅ Student saved successfully!");
        document.getElementById("student-management-form").reset();
    }).catch((error) => {
        alert("Error: " + error.message);
    });
}

function searchStudent() {
    const roll = document.getElementById("search-roll").value;
    const resultDiv = document.getElementById("student-info-result");
    if (!roll) {
        alert("⚠️ Please enter a Roll No to search.");
        return;
    }
    db.ref("students").orderByChild("rollNo").equalTo(roll).once("value").then((snapshot) => {
        if (snapshot.exists()) {
            let resultHTML = "";
            snapshot.forEach((childSnapshot) => {
                const student = childSnapshot.val();
                const studentKey = childSnapshot.key;
                resultHTML += `
                    <div class="info-box">
                        <p><strong>Roll No:</strong> ${student.rollNo}</p>
                        <p><strong>Name:</strong> ${student.name}</p>
                        <p><strong>Route:</strong> ${student.route}</p>
                        <p><strong>Year:</strong> ${student.year}</p>
                        <p><strong>Fee Balance:</strong> ₹${student.balance}</p>
                        <button class="delete-btn" onclick="deleteStudent('${studentKey}')">Delete Student</button>
                    </div>`;
            });
            resultDiv.innerHTML = resultHTML;
        } else {
            resultDiv.innerHTML = "<p>❌ Student not found!</p>";
        }
    }).catch((error) => {
        console.error("Error searching student: ", error);
    });
}

function deleteStudent(rollNo) {
    if (confirm(`Are you sure you want to delete student with roll number ${rollNo}?`)) {
        db.ref("students/" + rollNo).remove()
            .then(() => {
                alert("Student deleted successfully.");
                document.getElementById("student-info-result").innerHTML = "";
            })
            .catch((error) => {
                alert("Error deleting student: " + error.message);
            });
    }
}

// Driver Details Management
function loadDrivers() {
    const driverTableBody = document.getElementById("driverTableBody");
    db.ref("drivers").on("value", (snapshot) => {
        driverTableBody.innerHTML = "";
        snapshot.forEach((child) => {
            let driver = child.val();
            let key = child.key;
            let row = document.createElement("tr");
            row.innerHTML = `
                <td contenteditable="false">${driver.name}</td>
                <td contenteditable="false">${driver.busNo}</td>
                <td contenteditable="false">${driver.route}</td>
                <td class="actionCell">
                    <button onclick="editDriver('${key}', this)">Edit</button>
                    <button onclick="deleteDriver('${key}')">Delete</button>
                </td>`;
            driverTableBody.appendChild(row);
        });
    });
}

function addDriver() {
    let name = document.getElementById("driverName").value;
    let busNo = document.getElementById("busNo").value;
    let route = document.getElementById("route").value;
    if (name && busNo && route) {
        db.ref("drivers").push({ name, busNo, route });
        document.getElementById("driverForm").reset();
    } else {
        alert("Please fill all driver fields.");
    }
}

function editDriver(key, btn) {
    let row = btn.closest("tr");
    let tds = row.querySelectorAll("td");
    if (btn.innerText === "Edit") {
        tds.forEach(td => td.contentEditable = "true");
        row.querySelector(".actionCell").contentEditable = "false";
        btn.innerText = "Save";
    } else {
        let updated = {
            name: tds[0].innerText,
            busNo: tds[1].innerText,
            route: tds[2].innerText
        };
        db.ref("drivers/" + key).set(updated);
        tds.forEach(td => td.contentEditable = "false");
        btn.innerText = "Edit";
    }
}

function deleteDriver(key) {
    if (confirm("Are you sure you want to delete this driver?")) {
        db.ref("drivers/" + key).remove();
    }
}

// Bus & Schedule Management
function addSchedule() {
    const busNo = document.getElementById("bus-no").value;
    const route = document.getElementById("bus-route").value;
    const morning = document.getElementById("morning-time").value;
    const evening = document.getElementById("evening-time").value;
    const driver = document.getElementById("driver-name").value;
    const mobile = document.getElementById("driver-mobile").value;

    if (!busNo || !route || !morning || !evening || !driver || !mobile) {
        alert("⚠️ Please fill all schedule fields!");
        return;
    }
    db.ref("schedule").push().set({ busNo, route, morning, evening, driver, mobile })
        .then(() => {
            alert("Schedule added successfully!");
            document.getElementById("schedule-form").reset();
        });
}

function loadSchedule() {
    const scheduleRef = db.ref("schedule");
    scheduleRef.on("value", (snapshot) => {
        const data = snapshot.val();
        const adminTbody = document.getElementById("schedule-body-admin");
        const studentTbody = document.getElementById("schedule-body-student");

        if (adminTbody) adminTbody.innerHTML = "";
        if (studentTbody) studentTbody.innerHTML = "";

        if (!data) return;

        for (let key in data) {
            const item = data[key];
            const rowHtml = `
                <td>${item.busNo}</td> <td>${item.route}</td> <td>${item.morning}</td>
                <td>${item.evening}</td> <td>${item.driver}</td> <td>${item.mobile}</td>`;

            if (adminTbody) {
                const tr = document.createElement("tr");
                tr.innerHTML = rowHtml + `<td><button onclick="deleteSchedule('${key}')">❌ Delete</button></td>`;
                adminTbody.appendChild(tr);
            }
            if (studentTbody) {
                const tr = document.createElement("tr");
                tr.innerHTML = rowHtml;
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

// Route & Fees Management
function addRoute() {
    const route = document.getElementById("route-name").value;
    const distance = document.getElementById("route-distance").value;
    const fee = document.getElementById("route-fee").value;

    if (!route || !distance || !fee) {
        alert("⚠️ Please fill all route fields!");
        return;
    }
    db.ref("routes").push().set({ route, distance, fee })
        .then(() => {
            alert("Route added successfully!");
            document.getElementById("route-form").reset();
        });
}

function loadRoutes() {
    db.ref("routes").on("value", snapshot => {
        const data = snapshot.val();
        const adminTbody = document.getElementById("fees-body-admin");
        const studentTbody = document.getElementById("fees-body-student");

        if (adminTbody) adminTbody.innerHTML = "";
        if (studentTbody) studentTbody.innerHTML = "";

        if (!data) return;

        for (let key in data) {
            const item = data[key];
            const rowHtml = `<td>${item.route}</td><td>${item.distance} km</td><td>₹${item.fee}</td>`;

            if (adminTbody) {
                const tr = document.createElement("tr");
                tr.innerHTML = rowHtml + `<td><button onclick="deleteRoute('${key}')">❌ Delete</button></td>`;
                adminTbody.appendChild(tr);
            }
            if (studentTbody) {
                const tr = document.createElement("tr");
                tr.innerHTML = rowHtml;
                studentTbody.appendChild(tr);
            }
        }
    });
}

function deleteRoute(key) {
    if (confirm("Are you sure you want to delete this route?")) {
        db.ref("routes/" + key).remove();
    }
}


// --- 🚀 MAIN APP LOGIC (RUNS ON AUTH STATE CHANGE) ---
auth.onAuthStateChanged(user => {
    const authSection = document.getElementById("auth-section");
    const dashboard = document.getElementById("dashboard");
    const adminControls = document.getElementById("admin-controls");
    const driverLocation = document.getElementById("driver-location");
    const studentInfo = document.getElementById("student-info-section");

    if (user) {
        // User is signed in
        db.ref("users/" + user.uid).once("value").then(snapshot => {
            if (!snapshot.exists()) {
                console.error("User data not found in database!");
                logout();
                return;
            }

            const { role, email } = snapshot.val();
            currentUserRole = role;
            document.getElementById("user-role-display").innerText = `Logged in as: ${email} (Role: ${role})`;

            // Hide all sections first, then show the correct one
            authSection.style.display = "none";
            dashboard.style.display = "block";
            adminControls.style.display = "none";
            driverLocation.style.display = "none";
            studentInfo.style.display = "none";

            // Show sections based on role
            if (role === "admin") {
                adminControls.style.display = "block";
                studentInfo.style.display = "block"; // Admins can also see student view
                initMap();
                trackAllBuses();
                loadBusList();
                loadDrivers();
                loadSchedule();
                loadRoutes();
            } else if (role === "student") {
                studentInfo.style.display = "block";
                initMap();
                trackAllBuses();
                loadBusList();
                loadSchedule();
                loadRoutes();
            } else if (role === "driver") {
                driverLocation.style.display = "block";
                // Find the bus assigned to this driver's email
                db.ref("driverAssignments").orderByValue().equalTo(email).once("value", snap => {
                    if (snap.exists()) {
                        snap.forEach(child => {
                            document.getElementById("driver-bus-no").innerText = `Your Assigned Bus: ${child.key}`;
                            document.getElementById("busNumber").value = child.key;
                        });
                    } else {
                        document.getElementById("driver-bus-no").innerText = "No bus assigned. Contact admin.";
                    }
                });
            }
        });
    } else {
        // User is signed out
        authSection.style.display = "block";
        dashboard.style.display = "none";
        currentUserRole = null;
        if (map) {
            map.remove();
            map = null;
        }
    }
});
        
