---
layout: single
title: Optimización de queries en Rails
published: true
description: "En ciertas ocasiones debemos optimizar nuestras consultas para que estas no se conviertan en el cuello de botella de nuestra aplicación"
date: 2022-02-27T00:00:00.000Z
tags: ruby rails active-record benchmark
---

**Contexto:** Hace un tiempo, trabajé en un proyecto en el que tenía que dar reportes de la data que teníamos, la mayoría de los reportes que teníamos que calcular estarían en el dashboard. Teníamos una cantidad regular de data que consultar y esta data estaba dividida en muchas tablas. Las consultas que hacíamos a la base de datos, tenían que estar optimizadas para que nuestra API no demore tanto en responder o a veces para que no muera.

En este artículo, te contaré cómo fui solucionando cada uno de los problemas que tuve, iré desde los problemas más simples que uno puede ver en todos los proyectos en Rails hasta los más complejos.

La aplicación de ejemplo que usaré será un clon en su forma básica de Spotify o cualquier aplicación de música. Les explico cómo será las relaciones de nuestras tablas en nuestra base de datos.


(imagen de BD)

Tengo canciones que le pertenece a un artista y esta canción le pertenece a un album, también tenemos una tabla de usuarios, que son los que pueden votar o poner un rating a una canción o a un album. La tabla ratings tiene una relación polimórfica hacia canciones y hacia albums.

> **NOTA:** Una relación polimórfica es una forma en Rails de relacionar una tabla con más de una tabla a la vez sin necesidad de crear un foreign key con el nombre de la relación.

## Antes de empezar

¿Cómo analizaremos si estas soluciones son más rápidas?

Hay muchas formas de analizar tu código, aquí lo haré de 3 formas:
- Tiempo de ejecución (Elapsed time)
- Memoria (memory): espacio en tu disco que ocupa este código al ejecutar
- Iteraciones por segundo

Para tener estas 3 formas de medir nuestro código, usaremos el módulo `Benchmark` que nos da ruby, y las gemas `benchmark-ips` y `benchmark-memory`

## Primer Problema: Obtener el rating más alto en los albums

### Posibles Soluciones
**Primera solución:**
Usando una combinación de métodos de ActiveRecord con métodos de Ruby:
```rb
Album.includes(:ratings).map { |album| album.ratings.length }.max
```

**Segunda solución:**
Usando solo métodos de Active Record
```rb
Album.from(Album.select(
  "albums.*", "COUNT(ratings.id) AS rating_count"
).joins(:ratings).group("albums.id")).maximum("rating_count").explain
```
Ambos devuelven el mismo resultado 20. ¿Cuál es la diferencia?

### Analicemos la primera solución

La primera parte de esta solución usa un método de ActiveRecord:
```rb
Album.includes(:ratings)
```

Esto ejecuta el siguiente código SQL
```sql
SELECT "albums".* FROM "albums"

SELECT "ratings".* FROM "ratings" WHERE "ratings"."ratingable_type" = "Album" 
AND "ratings"."ratingable_id" IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...)
```
_(mientras más albums tengamos en nuestra base de datos, más grande será la lista de ratings que traeremos)_

La segunda parte es
```rb
.map { |album| album.ratings.length }.max
```
Este map itera sobre la respuesta que nos devuelve el includes que hicimos. En cada album, llama a todos los rating y calculamos (con Ruby) cuántos ratings tiene cada album. Una vez que tenemos la lista con todos los totales, con el método `max` de los `Enumerators` en Ruby podemos calcular el elemento con el máximo valor.

### Analicemos la segunda solución
Partiremos esta solución en dos partes, la primera que es la que está dentro del método from.
```rb
Album.select(
  "albums.*", "COUNT(ratings.id) AS rating_count"
).joins(:ratings).group("albums.id")
```

Esto se ejecturá en el siguiente código SQL:
```sql
SELECT albums.*, COUNT(ratings.id) AS rating_count
FROM "albums" INNER JOIN "ratings"
ON "ratings"."votable_type" = "Album" AND "ratings"."votable_id" = "albums"."id"
GROUP BY "albums"."id"
```

Aquí estamos agregando la columna `COUNT(ratings.id)` con el alias `rating_count` a nuestra consulta para que por cada album cuente cuántos ratings asociados tiene.

La segunda parte es:
```rb
Album.from(...).maximum("rating_count")
```

Esto se ejecutarán en el siguiente código SQL:
```sql
SELECT MAX(rating_count) FROM (...) subquery
```

Toda la consulta que explicamos en la primera parte pasa a ser la subquery sobre la que vamos a hacer otra consulta, en este caso sacar el máximo valor de una de la columna `rating_count`.

### Comparemos las soluciones

#### Tiempo de ejecución
Este es el código que ejecutaremos:
```rb
Benchmark.bmbm do |x|
  x.report("Active Record + Ruby code") { first_solution }
  x.report("Only Active Record") { second_solution }
end
```

> Nota: Estoy usando el método `bmbm` para que se ejecute dos veces los reportes, así ninguno de los métodos se verá afectado por ser el primero en ejecutarse.

Este es el resultado:
```
Rehearsal -------------------------------------------------------------
Active Record + Ruby code 0.003226   0.001329   0.004555 (  0.006984)
Only Active Record.       0.001192   0.000557   0.001749 (  0.003079)
---------------------------------------------------- total: 0.006304sec

                                  user     system      total        real
Active Record + Ruby code.    0.000633   0.000048   0.000681 (  0.000675)
Only Active Record.           0.000449   0.000020   0.000469 (  0.000466)
```

Si analizamos el resultado hay una ligera diferencia de tiempo entre ambas soluciones, siendo la segunda solución la más rápida.

#### Memoria
Este es el código que ejecutaremos:
```rb
Benchmark.memory do |x|
  x.report("Active Record + Ruby code") { first_solution }
  x.report("Only Active Record") { second_solution }
  x.compare!
end
```

Este es el resultado:
```
Calculating -------------------------------------
  Active Record + Ruby code  26.798k memsize (     0.000  retained)
                            415.000  objects (     0.000  retained)
                             33.000  strings (     0.000  retained)
  Only Active Record         17.420k memsize (    40.000  retained)
                            272.000  objects (     1.000  retained)
                             27.000  strings (     1.000  retained)

Comparison:
  Only Active Record:         17420 allocated
  Active Record + Ruby code:  26798 allocated - 1.54x more
```

Si vemos este resultado, podemos decir que la primera solución está utilizando **1.54 veces** más de memoria en comparación con la segunda solución.

#### Iteraciones por segundo

Este es el código que ejecutaremos:
```rb
Benchmark.ips do |x|
  x.report("Active Record + Ruby code") { first_solution }
  x.report("Only Active Record") { second_solution }
  x.compare!
end
```

Este es el resultado:
```
Warming up --------------------------------------
  Active Record + Ruby code   420.000  i/100ms
  Only Active Record          600.000  i/100ms
Calculating -------------------------------------
  Active Record + Ruby code   4.099k (± 4.9%) i/s -     20.580k in   5.034882s
  Only Active Record          5.907k (± 4.1%) i/s -     30.000k in   5.087834s

Comparison:
  Only Active Record:         5907.4 i/s
  Active Record + Ruby code:  4099.0 i/s - 1.44x  (± 0.00) slower
```

Como vemos en los resultados, la primera solución es **1.44 veces** más rápida que la segunda solución.

### Resultados de la comparación
- En tiempo de ejecución la segunda solución es ligeramente más rápida que la primera solución
- En cuento a la memoria la primera solución está utilizando 1.54 veces más de memoria en comparación con la segunda solución.
- Y sobre la cantidad de iteraciones por segundo, la primera solución es 1.44 veces más rápida que la segunda solución.

Entonces ¿por qué la segunda solución es la mejor?

Porque se hace una sola llamada en la base de datos y toda la operación se hace desde el lado de la BD. Esto hace que la busqueda se haga más rápida al estar en contacto directo con la data.
