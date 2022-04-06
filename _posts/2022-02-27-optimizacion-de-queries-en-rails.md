---
layout: single
title: Optimización de queries en Rails
published: true
description: "En ciertas ocasiones debemos optimizar nuestras consultas para que estas no se conviertan en el cuello de botella de nuestra aplicación"
date: 2022-02-27T00:00:00.000Z
tags: ruby rails active-record benchmark
header:
  og_image: /assets/images/articles/optimizacion-de-queries-en-rails.png
---

**Contexto:** Hace un tiempo, trabajé en un proyecto en el que tenía que dar reportes de la data que teníamos, la mayoría de los reportes que teníamos que calcular estarían en el dashboard. Teníamos una cantidad regular de data que consultar y esta data estaba dividida en muchas tablas. Las consultas que hacíamos a la base de datos, tenían que estar optimizadas para que nuestra API no demore tanto en responder o a veces para que no muera.

En este artículo, te contaré cómo fui solucionando cada uno de los problemas que tuve, iré desde los problemas más simples que uno puede ver en todos los proyectos en Rails hasta los más complejos.

La aplicación de ejemplo que usaré será un clon en su forma básica de Spotify o cualquier aplicación de música. Les explico cómo será las relaciones de nuestras tablas en nuestra base de datos.

![DB Schema](https://user-images.githubusercontent.com/4174791/160634200-149824c6-1500-4322-8e63-043443865d0d.png)

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
Active Record + Ruby code   5.554467   0.788396   6.342863 (  7.404660)
Only Active Record          0.003204   0.001894   0.005098 (  0.741973)
---------------------------------------------------- total: 6.347961sec

                                user     system      total        real
Active Record + Ruby code   5.042479   0.540590   5.583069 (  5.776371)
Only Active Record          0.001858   0.000419   0.002277 (  0.532489)
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
Active Record + Ruby code
                       585.804M memsize (     0.000  retained)
                         6.099M objects (     0.000  retained)
                        50.000  strings (     0.000  retained)
  Only Active Record    53.270k memsize (     0.000  retained)
                       511.000  objects (     0.000  retained)
                        50.000  strings (     0.000  retained)

Comparison:
  Only Active Record:      53270 allocated
Active Record + Ruby code:  585803866 allocated - 10996.88x more
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
Active Record + Ruby code
                         1.000  i/100ms
  Only Active Record     1.000  i/100ms
Calculating -------------------------------------
Active Record + Ruby code
                          0.159  (± 0.0%) i/s -      1.000  in   6.277377s
  Only Active Record     12.768  (± 7.8%) i/s -     64.000  in   5.032453s

Comparison:
  Only Active Record:       12.8 i/s
Active Record + Ruby code:        0.2 i/s - 80.15x  (± 0.00) slower
```

Como vemos en los resultados, la primera solución es **1.44 veces** más rápida que la segunda solución.

### Resultados de la comparación
- En tiempo de ejecución la segunda solución es más rápida que la primera solución
- En cuento a la memoria la primera solución está utilizando 10996x más de memoria en comparación con la segunda solución.
- Y sobre la cantidad de iteraciones por segundo, la primera solución es 80.15 veces más lenta que la segunda solución.

Entonces ¿por qué la segunda solución es la mejor?

Porque se hace una sola llamada en la base de datos y toda la operación se hace desde el lado de la BD. Esto hace que la busqueda se haga más rápida al estar en contacto directo con la data.

## Segundo problema: Top 10 canciones con su respectivos artistas que tienen el mayor rating

### Posibles soluciones

Esta vez tengo tres soluciones:
**Primera solución**
Usando métodos de Active Record y código de Ruby
```rb
ratings = Rating
            .where(votable_type: "Song")
            .group(:votable_id)
            .average(:vote)
            .sort_by { |r| -r[1] }
            .take(n).to_h

songs = Song
          .includes(:artists)
          .find(ratings.keys)

ratings.map do |song_id, rating|
   song = songs.find { |song| song.id == song_id }
   {
       song: song.title,
       artist: song.artists.map(&:name).join(", "),
       rating_avg: rating.to_f
   }
end
```

**Segunda solución**
Usando una sola query con muchos métodos de Active Record
```rb
Song
  .includes(:artists)
  .joins(:ratings)
  .select("songs.*, AVG(ratings.vote) as rating_avg")
  .group("songs.id")
  .order("rating_avg DESC")
  .limit(n)
  .map do |song|
    {
      song: song.title,
      artist: song.artists.map(&:name).join(", "),
      rating_avg: song.rating_avg
    }
  end
```

**Tercera solución**
Usando dos queries con métodos de Active Record y poco código de Ruby
```rb
ratings = Rating
            .select("ratings.votable_id, AVG(ratings.vote) as rating_avg")
            .where(votable_type: "Song")
            .group(:votable_id)
            .order("rating_avg DESC")
            .limit(n)

Song
  .includes(:artists)
  .find(ratings.map(&:votable_id))
  .map do |song|
    {
      song: song.title,
      artist: song.artists.map(&:name).join(", "),
      rating_avg: ratings.find { |rating| rating.votable_id == song.id }.rating_avg
    }
  end
```

### Analicemos la primera solución

Para calcular las canciones con mayor rating, primero busco en la tabla ratings, los ratings que están relacionados con la tabla songs.

Recuerden que la tabla ratings tenía una relación polimórfica con songs, por eso es que debemos buscar aquellos ratings cuyo `votable_type` es `Song`, así sabremos cuáles ratings son solo de songs. Luego vamos a agruparlos por `votable_id` (song.id) para poder sacar el `average` (promedio) de todos los ratings.

```rb
Rating
  .where(votable_type: "Song")
  .group(:votable_id)
  .average(:vote)
```

Esto nos devolverá un array de arrays de la siguiente forma: `[[votable_id, vote_avg], [votable_id, vote_avg]]`, con todos los ids de las canciones y el promedio de los ratings de estas.

Lo que hará ahora es ordenarlos por el segundo elemento del array de forma descendente, tomar los `n` primeros elementos y convertirlo en un hash.
```rb
.sort_by { |r| -r[1] }.take(n).to_h
```

En la segunda parte, obtenemos las canciones del hash que acabamos de generar, incluyendo los artistas asociados.
```rb
songs = Song.includes(:artists).find(ratings.keys)
```

Por último iteramos sobre el hash de ratings para generar la data requerida. En cada iteración buscamos el song al que le pertenece el rating y con eso armamos el hash a retornar como resultado.
```rb
ratings.map do |song_id, rating|
  song = songs.find { |song| song.id == song_id }
  {
    song: song.title,
    artist: song.artists.map(&:name).join(", "),
    rating_avg: rating.to_f
  }
end
```

### Analicemos la segunda solución

En esta solución intenté obtener el mismo resultado haciendo solo una consulta a la base de datos.

Primero haré una query sobre el `joins` de las tablas songs y ratings, para poder tener la data de ambas tablas. Usaré el método `includes(:artists)` para poder llamar a los artistas asociados a las canciones encontradas
```rb
Song.includes(:artists).joins(:ratings)
```

Sobre este `joins` vamos a pedir el `average` (por SQL gracias al método `select`) agrupados por `song.id`, luego ordenarlos por `rating_avg` y por último llamando solo a los `n` primeros records.
```rb
.select("songs.*, AVG(ratings.vote) as rating_avg")
.group("songs.id")
.order("rating_avg DESC")
.limit(n)
```

Finalmente iteramos sobre este resultado, para armar el hash que debemos retornar como resultado
```rb
.map do |song|
  {
    song: song.title,
    artist: song.artists.map(&:name).join(", "),
    rating_avg: song.rating_avg
  }
end
```

### Analicemos la tercera solución

Hacemos algo similar a la primera solución, pero no usamos el método `average` de `ActiveRecord`, sino lo haremos por SQL usando el método `select`. Hacemos el `group` para que se el cálculo se haga por canción, filtramos la busqueda a solo las canciones con el método `where`, y por último lo ordenamos y limitamos el resultado a los `n` primeros
```rb
ratings = Rating
            .select("ratings.votable_id, AVG(ratings.vote) as rating_avg")
            .where(votable_type: "Song")
            .group(:votable_id)
            .order("rating_avg DESC")
            .limit(n)
```

Luego buscamos los songs que de esos ratings que encontramos y le damos el formato que necesitamos para retornar el resultado esperado:
```rb
Song
  .includes(:artists)
  .find(ratings.map(&:votable_id))
  .map do |song|
    {
      song: song.title,
      artist: song.artists.map(&:name).join(", "),
      rating_avg: ratings.find do |rating|
                    rating.votable_id == song.id
                  end.rating_avg
    }
  end
```

### Comparemos las soluciones

**Tiempo de ejecución**
```
Rehearsal ----------------------------------------------------------------
Active Record + Ruby code      0.787713   0.196014   0.983727 (  1.645864)
Only Active Record             0.016700   0.002986   0.019686 (  0.567646)
Active Record + Ruby code v2   0.024173   0.000953   0.025126 (  0.403639)
------------------------------------------------------- total: 1.028539sec

                                   user     system      total        real
Active Record + Ruby code      0.595617   0.026087   0.621704 (  1.016591)
Only Active Record             0.008948   0.000577   0.009525 (  0.580103)
Active Record + Ruby code v2   0.002977   0.000137   0.003114 (  0.378619)
```

**Memoria**
```
Calculating -------------------------------------
Active Record + Ruby code
                       175.136M memsize (     0.000  retained)
                         2.422M objects (     0.000  retained)
                        50.000  strings (     0.000  retained)
  Only Active Record   303.235k memsize (     0.000  retained)
                         3.425k objects (     0.000  retained)
                        50.000  strings (     0.000  retained)
Active Record + Ruby code v2
                       347.840k memsize (     0.000  retained)
                         3.615k objects (     0.000  retained)
                        50.000  strings (     0.000  retained)

Comparison:
  Only Active Record:     303235 allocated
Active Record + Ruby code v2:     347840 allocated - 1.15x more
Active Record + Ruby code:  175135967 allocated - 577.56x more
```

**Iteraciones por segundo**
```
Warming up --------------------------------------
Active Record + Ruby code
                         1.000  i/100ms
  Only Active Record     1.000  i/100ms
Active Record + Ruby code v2
                         1.000  i/100ms
Calculating -------------------------------------
Active Record + Ruby code
                          0.947  (± 0.0%) i/s -      5.000  in   5.294872s
  Only Active Record      1.867  (± 0.0%) i/s -     10.000  in   5.357158s
Active Record + Ruby code v2
                          2.646  (± 0.0%) i/s -     14.000  in   5.292725s

Comparison:
Active Record + Ruby code v2:        2.6 i/s
  Only Active Record:        1.9 i/s - 1.42x  (± 0.00) slower
Active Record + Ruby code:        0.9 i/s - 2.79x  (± 0.00) slower
```

### Resultados de la comparación
* The elapsed time of the third solution is faster than the two first solutions.The first solution is slower than the other two.
* The third solution uses 1.15 times more memory than the second solution, and the first solution uses 557 times more memory than the second solution.
* And on the number of iterations per second, the second solution is 1.42 times slower than the third solution and the first solution 2.79 times slower than the third solution.

In conclusion, the third solution is the best, and the first solution is the least optimal. Why is the solution using pure Active Record the least optimal this time? Because the query we are doing makes joins of two tables, this has an optimization cost, as we can observe.


- En tiempo de ejecución, la tercera solución es más rápida que las dos primeras. La primera solución es mucho más lenta que las otras dos.
- En cuanto a la memoria, la tercera solución está utilizando **1.15** veces más de memoria en comparación con la segunda solución y la primera solución usa **557** veces más memoria en comparación con la segunda solución
- Y sobre la cantidad de iteraciones por segundo, la segunda solución es **1.42** veces más lenta que la tercera solución y la primera solución es **2.79** veces más más rápida que la tercera solución.

Sacando conclusiones, la tercera solución es la mejor y la primera solución es la menos óptima. ¿Por qué esta vez la solución que usa puro `Active Record` es la menos óptima? Porque la consulta que estamos haciendo hace un `joins` de dos tablas y esto tiene un costo de optimización como podemos observar.

## Tercer Problema: Reporte de reportes

Generar un reporte que tenga las top “N” canciones con el mayor rating y como párametros se pase aparte del número de canciones si queremos saber los artistas y albums de dichas canciones

**Opciones de solución:**
- Armar un hash con que contenga todo lo requerido llamando a diferentes métodos de acuerdo a los parámetros.
- Usar SQL y materialized views

**SQL Views**
- Son tablas virtuales creadas a partir de una consulta `SELECT` que normalmente une múltiples tablas.
- Cada vez que se llaman se ejecutará la consulta con la que ha sido definida.

**Materialized views**
- También son tablas virtuales creadas a partir de una consulta `SELECT` que normalmente une múltiples tablas como los SQL views.
- Pero esta almacena el resultado de la consulta haciendolos funcionar como una tabla de solo lectura.
- Como ventaja tiene que se pueden actualizar cuando lo necesitemos. Esto lo podemos hacer con la gema `scenic`.
- Pueden ser actualizados cuando lo necesitemos.

### Comparemos las soluciones

Estoy usando la mejor solución del segundo problema para compararlo con SQL y Materialized views.

**Tiempo de ejecución**
```
Rehearsal -------------------------------------------------------------
Active Record + Ruby code   0.096419   0.036263   0.132682 (  0.598458)
SQL View                    0.000640   0.000259   0.000899 (  0.001701)
Materialized View           0.000671   0.000172   0.000843 (  0.001408)
---------------------------------------------------- total: 0.134424sec

                                user     system      total        real
Active Record + Ruby code   0.008866   0.001029   0.009895 (  0.382414)
SQL View                    0.000122   0.000003   0.000125 (  0.000121)
Materialized View           0.000100   0.000000   0.000100 (  0.000098)
```

**Memoria**
```
Calculating -------------------------------------
Active Record + Ruby code
                       347.036k memsize (     0.000  retained)
                         3.611k objects (     0.000  retained)
                        50.000  strings (     0.000  retained)
            SQL View     1.992k memsize (     0.000  retained)
                        29.000  objects (     0.000  retained)
                         1.000  strings (     0.000  retained)
   Materialized View     1.992k memsize (     0.000  retained)
                        29.000  objects (     0.000  retained)
                         1.000  strings (     0.000  retained)

Comparison:
            SQL View:       1992 allocated
   Materialized View:       1992 allocated - same
Active Record + Ruby code:     347036 allocated - 174.21x more
```

**Iteraciones por segundo**
```
Warming up --------------------------------------
Active Record + Ruby code
                         1.000  i/100ms
            SQL View    10.036k i/100ms
   Materialized View    10.049k i/100ms
Calculating -------------------------------------
Active Record + Ruby code
                          2.652  (± 0.0%) i/s -     14.000  in   5.284182s
            SQL View     99.936k (± 1.1%) i/s -    501.800k in   5.021873s
   Materialized View    100.465k (± 0.7%) i/s -    502.450k in   5.001495s

Comparison:
   Materialized View:   100465.2 i/s
            SQL View:    99935.8 i/s - same-ish: difference falls within error
Active Record + Ruby code:        2.7 i/s - 37887.16x  (± 0.00) slower
```

**Resultados de la comparación**
* El tiempo de ejecución de la segunda y tercera solución es mucho más rápido que la primera solución.
* La primera solución usa 174.21 veces más memoria que las dos primeras soluciones.
* Y sobre el número de iteraciones por segundo, la primera solución is 37887.16 veces más lenta que las dos primeras soluciones.

En conclusión, la diferencia entre la solución optimizada del problema anterior y las nuevas soluciones usando SQL y Materialized views es muy notoria.

## Conclusiones
* El primer problema nos muestra cómo hacer Active Record más poderoso usando SQL queries.
* El segundo problema nos muestra que está bien usar Ruby como apoyo de Active Record.
* El tercer problema nos muestra que Active Record también tiene un límite, y que podemos usar SQL cuando lo necesitemos.


**EXTRA**
* Si tienes que lidiar con una cantidad considerable de data, intenta obtener solo data que necesites. Puedes usar los métodos `select` y `pluck` de Active Record.
* A veces los métodos de Ruby son mejores que los de Active Record, sobretodo para hacer cálculos.
* No tengas miedo de usar SQL con Active Record.
* Usa `size` o `length` en lugar de `count` si no quieres hacer un query adicional.
* Evita los queries `n + 1` con el método `includes`.

Espero que hayas disfrutado y aprendido algo nuevo de este artículo. ¡Gracias por leerme! ❤️
