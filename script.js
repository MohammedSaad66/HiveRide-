// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID"
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

// Send driver location
let interval;
function startSending() {
  const busNo = document.getElementById("busNumber").value.trim();
  if (!busNo) return alert("Enter bus number");
  if (navigator.geolocation) {
    interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(pos => {
        db.ref("busLocations/" + busNo).set({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: Date.now()
        });
      });
    }, 5000);
  } else {
    alert("Geolocation not supported");
  }
}

// Google Maps setup
let map, markers = {};
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 12.9721, lng: 77.5933 },
    zoom: 13
  });
}

// Track all buses on map
function trackAllBuses() {
  db.ref("busLocations").on("value", snap => {
    const data = snap.val();
    for (let busNo in data) {
      const { latitude, longitude } = data[busNo];
      const pos = { lat: latitude, lng: longitude };
      if (markers[busNo]) {
        markers[busNo].setPosition(pos);
      } else {
        markers[busNo] = new google.maps.Marker({
          position: pos,
          map,
          label: busNo,
          title: "Bus " + busNo
        });
      }
    }
  });
}

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

    // Common fee listener
    db.ref("commonFee").on("value", snap => {
      document.getElementById("common-fee").innerText = "Common Fee: ₹" + snap.val();
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

function sendOTP() {
  const phone = document.getElementById("phone-number").value;
  firebase.auth().signInWithPhoneNumber(phone, window.recaptchaVerifier)
    .then(result => {
      confirmationResult = result;
      alert("OTP sent.");
    })
    .catch(error => alert(error.message));
}

function verifyOTP() {
  const code = document.getElementById("otp-code").value;
  confirmationResult.confirm(code).then(result => {
    alert("Phone login successful!");
  }).catch(error => alert("OTP Error: " + error.message));
}

// Google Sign-In
function googleSignIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).then(result => {
    const user = result.user;
    db.ref("users/" + user.uid).set({ email: user.email, role: "student" });
  }).catch(error => alert("Google Sign-in error: " + error.message));
                                  }
