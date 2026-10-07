from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import urllib.parse
import json
import math

PORT = 8000

# ==========================================
# ADMIN SOZLAMALARI
# ==========================================

ADMIN_PASSWORD = "12345"


# ==========================================
# MASOFA HISOBLASH
# ==========================================

def distance_km(lat1, lon1, lat2, lon2):

    R = 6371

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    dlat = lat2 - lat1
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c


# ==========================================
# SERVER
# ==========================================

class ParkingServer(SimpleHTTPRequestHandler):

    # --------------------------------------
    # GET
    # --------------------------------------

    def do_GET(self):

        # ==============================
        # PARKING QIDIRISH
        # ==============================

        if self.path.startswith("/api/parking"):

            try:

                parsed = urllib.parse.urlparse(
                    self.path
                )

                params = urllib.parse.parse_qs(
                    parsed.query
                )

                lat = float(
                    params["lat"][0]
                )

                lon = float(
                    params["lon"][0]
                )

                print()
                print("================================")
                print("Parkinglar qidirilmoqda...")
                print("Latitude:", lat)
                print("Longitude:", lon)
                print("================================")

                # 3 km atrofidagi hudud
                delta = 0.035

                left = lon - delta
                right = lon + delta
                bottom = lat - delta
                top = lat + delta

                viewbox = (
                    f"{left},{top},{right},{bottom}"
                )

                query_params = {

                    "q": "parking",

                    "format": "jsonv2",

                    "limit": "50",

                    "viewbox": viewbox,

                    "bounded": "1",

                    "polygon_geojson": "1",

                    "addressdetails": "1",

                    "accept-language": "uz,en"

                }

                url = (
                    "https://nominatim.openstreetmap.org/search?"
                    + urllib.parse.urlencode(
                        query_params
                    )
                )

                request = urllib.request.Request(

                    url,

                    headers={
                        "User-Agent":
                        "GPS-Parking/1.0 "
                        "(local development)"
                    }

                )

                print(
                    "OpenStreetMap Nominatim "
                    "so'rovi yuborilmoqda..."
                )

                with urllib.request.urlopen(
                    request,
                    timeout=20
                ) as response:

                    raw_data = response.read()

                results = json.loads(
                    raw_data.decode("utf-8")
                )

                print(
                    "Nominatim natijalari:",
                    len(results)
                )

                # Faqat 3 km ichidagi natijalarni qoldirish
                parking_list = []

                for item in results:

                    try:

                        p_lat = float(
                            item["lat"]
                        )

                        p_lon = float(
                            item["lon"]
                        )

                        distance = distance_km(
                            lat,
                            lon,
                            p_lat,
                            p_lon
                        )

                        if distance <= 3:

                            item["distance_km"] = round(
                                distance,
                                2
                            )

                            parking_list.append(
                                item
                            )

                    except Exception:

                        continue

                # Eng yaqin parkinglar birinchi
                parking_list.sort(
                    key=lambda x:
                    x.get(
                        "distance_km",
                        999
                    )
                )

                print(
                    "3 km ichidagi parkinglar:",
                    len(parking_list)
                )

                result = json.dumps(
                    parking_list,
                    ensure_ascii=False
                ).encode("utf-8")

                self.send_response(200)

                self.send_header(
                    "Content-Type",
                    "application/json; charset=utf-8"
                )

                self.send_header(
                    "Access-Control-Allow-Origin",
                    "*"
                )

                self.end_headers()

                self.wfile.write(result)

                return

            except Exception as error:

                print()
                print(
                    "PARKING API XATOSI:"
                )

                print(error)

                self.send_json(
                    {
                        "error": str(error)
                    },
                    500
                )

                return


        # ==============================
        # ADMIN LOGIN
        # ==============================

        if self.path.startswith(
            "/api/admin/check"
        ):

            self.send_json(
                {
                    "status": "ok"
                },
                200
            )

            return


        # Oddiy fayllar
        return super().do_GET()


    # --------------------------------------
    # POST
    # --------------------------------------

    def do_POST(self):

        # ==============================
        # ADMIN LOGIN
        # ==============================

        if self.path == "/api/admin/login":

            try:

                content_length = int(
                    self.headers.get(
                        "Content-Length",
                        0
                    )
                )

                body = self.rfile.read(
                    content_length
                )

                data = json.loads(
                    body.decode("utf-8")
                )

                password = data.get(
                    "password",
                    ""
                )

                if password == ADMIN_PASSWORD:

                    self.send_json(
                        {
                            "success": True,
                            "message":
                                "Admin sifatida kirildi."
                        },
                        200
                    )

                else:

                    self.send_json(
                        {
                            "success": False,
                            "message":
                                "Parol noto'g'ri."
                        },
                        401
                    )

            except Exception as error:

                self.send_json(
                    {
                        "success": False,
                        "message": str(error)
                    },
                    400
                )

            return


        # Noma'lum POST
        self.send_json(
            {
                "error":
                    "Noma'lum API"
            },
            404
        )


    # --------------------------------------
    # JSON YUBORISH
    # --------------------------------------

    def send_json(
        self,
        data,
        status=200
    ):

        result = json.dumps(
            data,
            ensure_ascii=False
        ).encode("utf-8")

        self.send_response(
            status
        )

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8"
        )

        self.send_header(
            "Access-Control-Allow-Origin",
            "*"
        )

        self.send_header(
            "Content-Length",
            str(len(result))
        )

        self.end_headers()

        self.wfile.write(
            result
        )


# ==========================================
# SERVERNI ISHGA TUSHIRISH
# ==========================================

print()
print("========================================")
print("          GPS PARKING SERVER")
print("========================================")
print()
print("Sayt manzili:")
print(
    "http://localhost:8000/parking.html"
)
print()
print("Admin paroli:")
print(
    ADMIN_PASSWORD
)
print()
print("Server ishlayapti...")
print()
print(
    "To'xtatish uchun CTRL + C bosing."
)
print()


server = HTTPServer(
    ("localhost", PORT),
    ParkingServer
)

server.serve_forever()