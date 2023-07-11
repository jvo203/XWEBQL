import sqlite3
import hashlib
import urllib.request, urllib.error
import time
from bs4 import BeautifulSoup

conn = sqlite3.connect("atom.db", isolation_level=None)
c = conn.cursor()

strSQL = "DROP TABLE IF EXISTS lines ;"

try:
    c.execute(strSQL)
except sqlite3.OperationalError as err:
    print(err, ":", strSQL)

strSQL = "CREATE TABLE lines (ion TEXT, energy REAL, upper REAL, lower REAL, emissivity REAL, te_peak REAL, intensity REAL, hash TEXT UNIQUE) ;"

try:
    c.execute(strSQL)
except sqlite3.OperationalError as err:
    print(err, ":", strSQL)


def parse_results(res):
    for row in res.findAll("tr"):  # , style=True):
        data = row.findAll("td")

        if len(data) == 7:
            print(data)

            ion = data[0].text
            energy = float(data[1].text)
            upper = float(data[2].text)
            lower = float(data[3].text)
            emissivity = float(data[4].text)
            te_peak = float(data[5].text)
            intensity = float(data[6].text)

            # print the row data
            print(
                ion,
                "|",
                energy,
                "|",
                upper,
                "|",
                lower,
                "|",
                emissivity,
                "|",
                te_peak,
                "|",
                intensity,
            )

            strHash = (
                ion
                + str(energy)
                + str(upper)
                + str(lower)
                + str(emissivity)
                + str(te_peak)
                + str(intensity)
            )

            hash_object = hashlib.md5(strHash.encode())
            hash = hash_object.hexdigest()

            strSQL = (
                "INSERT INTO lines VALUES('"
                + ion.replace("'", "''")
                + "',"
                + str(energy)
                + ","
                + str(upper)
                + ","
                + str(lower)
                + ","
                + str(emissivity)
                + ","
                + str(te_peak)
                + ","
                + str(intensity)
                + ",'"
                + hash.replace("'", "''")
                + "') ;"
            )

            try:
                c.execute(strSQL)
            except sqlite3.OperationalError as err:
                print(err, ":", strSQL)
            except sqlite3.IntegrityError as err:
                print(err, ":", strSQL)

    conn.commit()


def fetch_lines(url):
    success = False

    while not success:
        try:
            response = urllib.request.urlopen(url)
            success = True
        except urllib.URLError as err:
            print(err)
            time.sleep(10)

    page = BeautifulSoup(response.read(), features="html.parser")
    results = page.body.find("table")

    parse_results(results)


def finalize_db():
    strSQL = "DROP TABLE IF EXISTS new_lines ;"

    try:
        c.execute(strSQL)
    except sqlite3.OperationalError as err:
        print(err, ":", strSQL)

    #############################################################
    strSQL = "CREATE TABLE new_lines (ion TEXT, energy REAL, upper REAL, lower REAL, emissivity REAL, te_peak REAL, intensity REAL) ;"

    try:
        c.execute(strSQL)
    except sqlite3.OperationalError as err:
        print(err, ":", strSQL)

    #############################################################
    strSQL = "INSERT INTO new_lines SELECT ion, energy, upper, lower, emissivity, te_peak, intensity FROM lines;"

    try:
        c.execute(strSQL)
    except sqlite3.OperationalError as err:
        print(err, ":", strSQL)

    #############################################################
    strSQL = "DROP TABLE IF EXISTS lines ;"

    try:
        c.execute(strSQL)
    except sqlite3.OperationalError as err:
        print(err, ":", strSQL)

    #############################################################
    strSQL = "ALTER TABLE new_lines RENAME TO lines ;"

    try:
        c.execute(strSQL)
    except sqlite3.OperationalError as err:
        print(err, ":", strSQL)

    #############################################################
    strSQL = "CREATE INDEX ene_idx ON lines (energy) ;"

    try:
        c.execute(strSQL)
    except sqlite3.OperationalError as err:
        print(err, ":", strSQL)

    #############################################################
    strSQL = "vacuum ;"

    try:
        c.execute(strSQL)
    except sqlite3.OperationalError as err:
        print(err, ":", strSQL)


def build_url(base, wvl, wvr, unit):
    url = (
        base
        + "?wvl="
        + str(wvl)
        + "&wvlunit="
        + unit
        + "&wvr="
        + str(wvr)
        + "&ems=1.e-18&teunit="
        + unit
    )
    return url


server = "http://www.atomdb.org/Webguide/wavelength_region.php"

url = build_url(server, 1.0, 0.1, "keV")
fetch_lines(url)

finalize_db()
conn.close()
