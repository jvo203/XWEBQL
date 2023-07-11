import sqlite3
import hashlib
import urllib
import time
from bs4 import BeautifulSoup

conn = sqlite3.connect("atom.db")
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
print(url)

conn.close()
