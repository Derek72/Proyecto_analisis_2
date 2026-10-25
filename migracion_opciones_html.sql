UPDATE OPCION SET Pagina = REPLACE(Pagina, '.php', '.html') WHERE Pagina LIKE '%.php';
UPDATE OPCION SET Pagina = 'bancos.html' WHERE Pagina = 'banco.html';
