

function openLogin() {
    const modal = document.getElementById("loginModal");

    if (!modal) return;

    modal.style.display = "flex";

    const password = document.getElementById("adminPassword");
    const message = document.getElementById("loginMessage");

    if (password) {
        password.value = "";
        setTimeout(() => password.focus(), 100);
    }

    if (message) {
        message.textContent = "";
    }
}

function closeLogin() {
    const modal = document.getElementById("loginModal");

    if (modal) {
        modal.style.display = "none";
    }
}

async function loginAdmin() {
    const passwordElement = document.getElementById("adminPassword");
    const message = document.getElementById("loginMessage");

    if (!passwordElement || !message) return;

    const password = passwordElement.value.trim();

    if (!password) {
        message.textContent = "Parolni kiriting.";
        return;
    }

    try {
        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                password: password
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            isAdmin = true;

            closeLogin();

            const panel = document.getElementById("adminPanel");
            const button = document.getElementById("adminLoginButton");

            if (panel) {
                panel.style.display = "block";
            }

            if (button) {
                button.textContent = "Admin rejimi";
            }

            if (typeof setAdminMode === "function") {
                setAdminMode(true);
            }

            if (typeof showInfo === "function") {
                showInfo("Admin rejimi yoqildi.");
            }

        } else {
            message.textContent = "Parol noto‘g‘ri.";
        }

    } catch (error) {
        console.error("Admin login xatosi:", error);
        message.textContent = "Server bilan bog‘lanishda xato.";
    }
}

function logoutAdmin() {
    isAdmin = false;

    const panel = document.getElementById("adminPanel");
    const button = document.getElementById("adminLoginButton");

    if (panel) {
        panel.style.display = "none";
    }

    if (button) {
        button.textContent = "Admin kirish";
    }

    if (typeof setAdminMode === "function") {
        setAdminMode(false);
    }

    if (typeof showInfo === "function") {
        showInfo("Admin rejimidan chiqildi.");
    }
}

window.addEventListener("DOMContentLoaded", function () {

    console.log("admin.js ishga tushdi");

    const adminLoginButton =
        document.getElementById("adminLoginButton");

    const gpsButton =
        document.getElementById("gpsButton");

    const loginButton =
        document.getElementById("loginButton");

    const cancelLoginButton =
        document.getElementById("cancelLoginButton");

    const startDrawingButton =
        document.getElementById("startDrawingButton");

    const finishDrawingButton =
        document.getElementById("finishDrawingButton");

    const clearDrawingButton =
        document.getElementById("clearDrawingButton");

    const deleteParkingButton =
        document.getElementById("deleteParkingButton");

    const logoutButton =
        document.getElementById("logoutButton");

    const adminPassword =
        document.getElementById("adminPassword");


    if (adminLoginButton) {
        adminLoginButton.addEventListener(
            "click",
            openLogin
        );
    }


    if (gpsButton) {
        gpsButton.addEventListener(
            "click",
            function () {

                console.log("GPS tugmasi bosildi");

                if (typeof getUserLocation === "function") {
                    getUserLocation();
                } else {
                    alert("GPS funksiyasi yuklanmagan.");
                }

            }
        );
    }


    if (loginButton) {
        loginButton.addEventListener(
            "click",
            loginAdmin
        );
    }


    if (cancelLoginButton) {
        cancelLoginButton.addEventListener(
            "click",
            closeLogin
        );
    }


    if (startDrawingButton) {
        startDrawingButton.addEventListener(
            "click",
            function () {

                if (!isAdmin) {
                    alert("Avval Admin sifatida kiring.");
                    return;
                }

                if (typeof startDrawingParking === "function") {
                    startDrawingParking();
                } else {
                    alert("Parking chizish funksiyasi yuklanmagan.");
                }

            }
        );
    }


    if (finishDrawingButton) {
        finishDrawingButton.addEventListener(
            "click",
            function () {

                if (!isAdmin) {
                    alert("Avval Admin sifatida kiring.");
                    return;
                }

                if (typeof finishDrawingParking === "function") {
                    finishDrawingParking();
                } else {
                    alert("Funksiya yuklanmagan.");
                }

            }
        );
    }


    if (clearDrawingButton) {
        clearDrawingButton.addEventListener(
            "click",
            function () {

                if (typeof clearCurrentDrawing === "function") {
                    clearCurrentDrawing();
                }

            }
        );
    }


    if (deleteParkingButton) {
        deleteParkingButton.addEventListener(
            "click",
            function () {

                if (!isAdmin) {
                    alert("Avval Admin sifatida kiring.");
                    return;
                }

                if (typeof deleteSelectedParking === "function") {
                    deleteSelectedParking();
                }

            }
        );
    }


    if (logoutButton) {
        logoutButton.addEventListener(
            "click",
            logoutAdmin
        );
    }


    if (adminPassword) {
        adminPassword.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {
                    loginAdmin();
                }

            }
        );
    }

});