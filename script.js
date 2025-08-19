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

// Toggle Register/Login view
function toggleAuth() {
  const reg = document.getElementById("register-section");
  const log = document.getElementById("login-section");
  reg.style.display = reg.style.display === "none" ? "block" : "none";
  log.style.display = log.style.display === "none" ? "block" : "none";
}

// Register
function register() {
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const role = document.getElementById("reg-role").value;
  auth.createUserWithEmailAndPassword(email, password).then(cred => {
    return db.ref("users/" + cred.user.uid).set({ email, role });
  });
}

// Login
function login() {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  auth.signInWithEmailAndPassword(email, password);
}

// Logout
function logout() {
  auth.signOut();
}
  // Map initialization
    var map = L.map('map').setView([12.9165, 79.1325], 12);

    //osm layer
    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    osm.addTo(map);
   let busMarkers = {}; // store markers for buses

   // Function to update marker
   function updateBusMarker(busId, lat, lng) {
       if (busMarkers[busId]) {
           busMarkers[busId].setLatLng([lat, lng]); // move marker
       } else {
           busMarkers[busId] = L.marker([lat, lng]).addTo(map)
               .bindPopup(`<b>${busId}</b>`);
       }
   }

   // Listen to Firebase
   const busesRef = firebase.database().ref("buses");
   busesRef.on("value", snapshot => {
       let buses = snapshot.val();
       if (!buses) return;

       // Clear all markers if needed
       // Object.values(busMarkers).forEach(marker => map.removeLayer(marker));
       // busMarkers = {};

       // Add/update markers
       for (let busId in buses) {
           let { latitude, longitude } = buses[busId];
           updateBusMarker(busId, latitude, longitude);
       }
   });

   // When student selects a bus
   document.getElementById("busSelect").addEventListener("change", function () {
       let selectedBus = this.value;

       if (selectedBus && busMarkers[selectedBus]) {
           map.setView(busMarkers[selectedBus].getLatLng(), 14); // zoom to bus
           busMarkers[selectedBus].openPopup();
       }
   });


// Load bus list into dropdown
function loadBusList() {
  db.ref("busDetails").once("value", snap => {
    const selector = document.getElementById("bus-selector");
    selector.innerHTML = '<option>Select a bus</option>';
    snap.forEach(child => {
      const option = document.createElement("option");
      option.value = child.key;
      option.text = child.key + " - " + child.val().route;
      selector.appendChild(option);
    });
  });
}

// Show selected bus details
function showBusDetails() {
  const busNo = document.getElementById("bus-selector").value;
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

// Edit bus details
function editBusDetails() {
  const busNo = document.getElementById("bus-edit-number").value;
  const route = document.getElementById("bus-edit-route").value;
  const name = document.getElementById("bus-edit-driver").value;
  const phone = document.getElementById("bus-edit-phone").value;
  if (busNo && route && name && phone) {
    db.ref("busDetails/" + busNo).set({ route, driverName: name, driverPhone: phone });
    alert("Bus details updated.");
  }
}
// 🚍 Add a new route
function addRoute() {
  const name = document.getElementById("route-name").value.trim();
  const distance = parseFloat(document.getElementById("route-distance").value);
  const fee = parseFloat(document.getElementById("route-fee").value);
  if (!name || isNaN(distance) || isNaN(fee)) {
    return alert("Enter valid route data.");
  }
  db.ref("routes/" + name).set({ distance, fee }).then(() => {
    alert("Route added.");
    loadRoutes(); // reload after add
  });
}
// Example schedule load
function loadSchedule() {
    const scheduleRef = firebase.database().ref("schedule");
    scheduleRef.on("value", (snapshot) => {
        const data = snapshot.val();
        const tbody = document.getElementById("schedule-body");
        tbody.innerHTML = "";
        for (let key in data) {
            const tr = document.createElement("tr");

            const tdItem = document.createElement("td");
            tdItem.innerText = data[key];
            tr.appendChild(tdItem);

            const tdActions = document.createElement("td");

            // Edit button
            const editBtn = document.createElement("button");
            editBtn.innerText = "Edit";
            editBtn.onclick = () => {
                const newVal = prompt("Edit schedule:", data[key]);
                if (newVal) {
                    firebase.database().ref("schedule/" + key).set(newVal);
                }
            };
            tdActions.appendChild(editBtn);

            // Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.innerText = "Delete";
            deleteBtn.onclick = () => {
                firebase.database().ref("schedule/" + key).remove();
            };
            tdActions.appendChild(deleteBtn);

            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        }
    });
}

// Add new schedule item
function addSchedule() {
    const val = document.getElementById("new-schedule").value;
    if (val) {
        firebase.database().ref("schedule").push(val);
        document.getElementById("new-schedule").value = "";
    }
}
// 📋 Load routes into dropdown and list
function loadRoutes() {
  const routeSelect = document.getElementById("student-route-edit");
  const routeList = document.getElementById("route-list");

  if (routeSelect) routeSelect.innerHTML = '<option value="">Select Route</option>';
  if (routeList) routeList.innerHTML = "";

  db.ref("routes").once("value", snap => {
    snap.forEach(child => {
      const name = child.key;
      const { distance, fee } = child.val();

      if (routeSelect) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name} (₹${fee}, ${distance}km)`;
        routeSelect.appendChild(option);
      }

      if (routeList) {
        const li = document.createElement("li");
        li.textContent = `${name}: ₹${fee}, ${distance}km`;
        routeList.appendChild(li);
      }
    });
  });
}

// ✏️ Admin sets student name, fee, and route
function editStudentDetails() {
  const email = document.getElementById("student-email-edit").value.trim();
  const name = document.getElementById("student-name-edit").value.trim();
  const route = document.getElementById("student-route-edit").value;
  const fee = parseFloat(document.getElementById("student-fee-edit").value);

  if (!email || !name || !route || isNaN(fee)) {
    return alert("Please fill all student details.");
  }

  db.ref("studentInfo/" + email.replace(/\./g, "_")).set({
    name, route, fee
  }).then(() => {
    alert("Student details updated.");
  });
}
// Auth state check
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("dashboard").style.display = "block";

    db.ref("users/" + user.uid).once("value").then(snapshot => {
      const { role, email } = snapshot.val();
      document.getElementById("user-role").innerText = role;

      if (role === "admin") {
        document.getElementById("admin-controls").style.display = "block";
        document.getElementById("map-section").style.display = "block";
        initMap(); trackAllBuses(); loadBusList();
      }
      if (role === "student") {
        document.getElementById("map-section").style.display = "block";
        initMap(); trackAllBuses(); loadBusList();
      }
      if (role === "driver") {
        document.getElementById("driver-location").style.display = "block";
        db.ref("driverAssignments").orderByValue().equalTo(email).once("value", snap => {
          snap.forEach(child => {
            document.getElementById("driver-bus-no").innerText = child.key;
            document.getElementById("busNumber").value = child.key;
          });
        });
      }
    });

    // Schedule listener
    db.ref("schedule").on("value", snap => {
      const list = document.getElementById("schedule-list");
      list.innerHTML = "";
      snap.forEach(child => {
        const li = document.createElement("li");
        li.innerText = child.val();
        list.appendChild(li);
      });
    });



    // Student fees listener
    db.ref("studentFees").on("value", snap => {
      const list = document.getElementById("fees-list");
      list.innerHTML = "";
      snap.forEach(child => {
        const li = document.createElement("li");
        li.innerText = `${child.key}: ₹${child.val()}`;
        list.appendChild(li);
      });
    });
  } else {
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});

// Admin schedule + fee handlers
function addSchedule() {
  const item = document.getElementById("new-schedule").value;
  if (!item) return;
  db.ref("schedule").push(item);
}

function setCommonFee() {
  const fee = document.getElementById("common-fee-input").value;
  db.ref("commonFee").set(Number(fee));
}

function setStudentFee() {
  const input = document.getElementById("student-fee").value;
  const [email, fee] = input.split(":");
  db.ref("studentFees/" + email.trim()).set(Number(fee.trim()));
}

function assignDriverBus() {
  const input = document.getElementById("driver-assign").value;
  const [driverEmail, busNo] = input.split(":");
  db.ref("driverAssignments/" + busNo.trim()).set(driverEmail.trim());
}

// OTP login
window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
  size: 'invisible',
  callback: response => sendOTP()
});

let confirmationResult;


// Google Sign-In
function googleSignIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).then(result => {
    const user = result.user;
    db.ref("users/" + user.uid).set({ email: user.email, role: "student" });
  }).catch(error => alert("Google Sign-in error: " + error.message));
   }
