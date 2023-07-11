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
