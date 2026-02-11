<?php
echo "default_charset: " . ini_get('default_charset') . "\n";
echo "mbstring.internal_encoding: " . ini_get('mbstring.internal_encoding') . "\n";
echo "mbstring.http_output: " . ini_get('mbstring.http_output') . "\n";
echo "Current locale: " . setlocale(LC_ALL, 0) . "\n";