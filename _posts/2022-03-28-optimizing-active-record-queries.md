---
layout: single
title: Optimizing Active Record queries
published: true
description: "Sometimes we must optimize our queries so that they do not become the bottleneck of our application."
date: 2022-03-28T00:00:00.000Z
tags: ruby rails active-record benchmark
header:
  og_image: /assets/images/articles/optimizing-active-record-queries.png
---

**Context**: Some time ago, I worked on a project where I had to make a lot of reports. We had a lot of data, and most of the reports should be in the application's dashboard. The data was divided into more than one table, so I had to make queries joining many tables every time I wanted to generate a new report. That made our application slow and even sometimes broke.

In this article, I'll show you how I used Active Record to fix the app's problems and if there's a limit on how to customize Active Record queries.

The sample app I'll use will be a clone (in a base form) of Spotify or any music app. Let me explain how will be the tables relationship in our database.

![DB Schema](https://user-images.githubusercontent.com/4174791/160634200-149824c6-1500-4322-8e63-043443865d0d.png)


All the `songs` belong to an `artist` and an `album`. We also have the `users` table who can vote or rate a song or album. The `ratings` table has a polymorphic relation to `songs` and `albums`.

> NOTE: A polymorphic relation is how Rails associate with more than one table simultaneously without the need to create a foreign key with the name of the association.

## Before Start

### ¿How will we know if these solutions are fast?
There are a lot of ways to analyze your code. In this article, I'll make with these 3 ways:
* Elapsed time
* Memory: space in the disk that the code occupies in execution
* Iterations per second


To have these 3 ways to measure our code, we will use the `Benchmark` module inside Ruby and the gems `benchmark-ips` and `benchmark-memory`.

## First Problem: Get the highest rating albums
### Possible Solutions
**First solution:**
Using a combination of `Active Record` and `Ruby` methods:
```rb
Album.includes(:ratings).map { |album| album.ratings.length }.max
```

**Second solution:**
Using only `Active Record` methods
```rb
Album.from(Album.select(
  "albums.*", "COUNT(ratings.id) AS rating_count"
).joins(:ratings).group("albums.id")).maximum("rating_count")
```

Both return the same result: 20. What is the difference?

### Let's analyze the first solution
The first part of this solution uses an `Active Record` method:
```rb
Album.includes(:ratings)
```
This expression executes the following SQL code:
```sql
SELECT "albums".* FROM "albums"

SELECT "ratings".* FROM "ratings" WHERE "ratings"."ratingable_type" = "Album" 
AND "ratings"."ratingable_id" IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...)
```
> _The more albums we have in our database, the longer the ranking list we have._

The second part is
```rb
.map { |album| album.ratings.length }.max
```
The `map` method iterates over the result of the `includes` method we did before. Inside every album, we call all the ratings associated with that album, and we calculate (with Ruby) how many ratings have every album. Once we have the list with all the totals, with the `max` method of the `Enumerators` in Ruby, we can calculate the element with the max value inside the array.


### Let's analyze the second solution
Let's break the solution in two parts, the first is inside the `from` method.
```rb
Album.select(
  "albums.*", "COUNT(ratings.id) AS rating_count"
).joins(:ratings).group("albums.id")
```

This will execute the following SQL code:
```sql
SELECT albums.*, COUNT(ratings.id) AS rating_count
FROM "albums" INNER JOIN "ratings"
ON "ratings"."votable_type" = "Album" AND "ratings"."votable_id" = "albums"."id"
GROUP BY "albums"."id"
```

Here we add the `COUNT(rating.id)` column with the alias `rating_count` to our query to count how many associated ratings have every album.

The second part is: 
```rb
Album.from(...).maximum("rating_count")
```

This will execute the following SQL code:
```sql
SELECT MAX(rating_count) FROM (...) subquery
```

The first part of the query we explained becomes the subquery on which we will run another query. The query will get the maximum value of the `rating_count` column.

### Let's compare the solutions
**Elapsed Time**
This is the code we will execute:
```rb
Benchmark.bmbm do |x|
  x.report("Active Record + Ruby code") { first_solution }
  x.report("Only Active Record") { second_solution }
end
```

> Note: I'm using the `bmbm` method to execute the reports twice, so none of the methods will be affected, only for being the first.

This is the result:
```
Rehearsal -------------------------------------------------------------
Active Record + Ruby code   5.554467   0.788396   6.342863 (  7.404660)
Only Active Record          0.003204   0.001894   0.005098 (  0.741973)
---------------------------------------------------- total: 6.347961sec

                                user     system      total        real
Active Record + Ruby code   5.042479   0.540590   5.583069 (  5.776371)
Only Active Record          0.001858   0.000419   0.002277 (  0.532489)
```

If we analyze the result, there is a slight time difference between the two solutions, with the second one being faster.

**Memory**
This is the code we will execute:
```rb
Benchmark.memory do |x|
  x.report("Active Record + Ruby code") { first_solution }
  x.report("Only Active Record") { second_solution }
  x.compare!
end
```

This is the result:
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

If we look at this result, we can say that the first solution uses 1.54 times more memory than the second solution.

**Iterations per second**
This is the code we will execute:
```rb
Benchmark.ips do |x|
  x.report("Active Record + Ruby code") { first_solution }
  x.report("Only Active Record") { second_solution }
  x.compare!
end
```

This is the result:
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

As we see in the results, the first solution is 1.44 times faster than the second one.


### Results of comparison
* The second solution is faster than the first solution at elapsed time.
* In terms of memory, the first solution uses 10996x times more memory than the second solution.
* And on the number of iterations per second, the first solution is 80.15 times slower than the second solution.

So why is the second solution the best? Because we are doing only one call on the database, and the whole operation is done from the DB side.


## Second problem: Top 10 songs with their artists that have the highest rating
### Possible solutions

This time I have 3 solutions:


**First solution**

Using `Active Record` and `Ruby`
```rb
ratings = Rating
            .where(votable_type: "Song")
            .group(:votable_id).average(:vote)
            .sort_by { |r| -r[1] }.take(n).to_h

songs = Song.includes(:artists).find(ratings.keys)

ratings.map do |song_id, rating|
   song = songs.find { |song| song.id == song_id }
   {
       song: song.title,
       artist: song.artists.map(&:name).join(", "),
       rating_avg: rating.to_f
   }
end
```
**Second solution**

Using only one query with a lot of `Active Record` methods
```rb
Song
  .includes(:artists).joins(:ratings)
  .select("songs.*, AVG(ratings.vote) as rating_avg")
  .group("songs.id").order("rating_avg DESC").limit(n)
  .map do |song|
    {
      song: song.title,
      artist: song.artists.map(&:name).join(", "),
      rating_avg: song.rating_avg
    }
  end
```

**Third solution**

Using 2 queries with `Active Record` methods and `Ruby` code
```rb
ratings = Rating
            .select("ratings.votable_id, AVG(ratings.vote) as rating_avg")
            .where(votable_type: "Song")
            .group(:votable_id).order("rating_avg DESC")
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
### Let's analyze the first solution
To calculate the songs with the highest rating, I first search in the `ratings` table for the ratings related to the songs table.
Remember that the `ratings` table has a polymorphic relationship with `songs`, so we must look for those ratings whose `votable_type` is `Song`, so we will know which ratings are songs. Then we will group them by `votable_id` (song.id) to obtain the average of all the ratings.
```rb
Rating
  .where(votable_type: "Song")
  .group(:votable_id)
  .average(:vote)
```
This expression will return an array of arrays with the following structure: `[[votable_id, vote_avg], [votable_id, vote_avg]]`. It has all the songs' ids and the average of their ratings.

It will sort them by the second element of the array in descending order, then take the first 'n' elements and convert it into a hash.
```rb
.sort_by { |r| -r[1] }.take(n).to_h
```

The second part will get the songs of the hash we just generated, including the associated artists.
```rb
songs = Song.includes(:artists).find(ratings.keys)
```
Lastly, we iterate over the hash of the ratings to generate the required data. In every iteration, we search for the song which belongs to the rating, and we build the hash to return as a result.
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
### Let's analyze the second solution
I tried to get the same result in this solution by doing only one query to the database.
First, I'll make a query over the `joins` of the tables `songs` and `ratings`, so I can have the data from both tables. I'll use the `includes(:artists)` method to call all the associated artists to the found songs.
```rb
Song.includes(:artists).joins(:ratings)
```

Over the `joins`, we will ask for the average (in SQL) grouped by `song.id`, then sort them by `rating_avg` and at the end call only the first `n` records.
```rb
.select("songs.*, AVG(ratings.vote) as rating_avg")
.group("songs.id")
.order("rating_avg DESC")
.limit(n)
```

Finally, we will iterate over the result to build the hash we should return as a result
```rb
.map do |song|
  {
    song: song.title,
    artist: song.artists.map(&:name).join(", "),
    rating_avg: song.rating_avg
  }
end
```

### Let's analyze the third solution
We make something similar to the first solution, but we don't use the `average` method from `ActiveRecord`. Otherwise, we will do it by SQL using the `select` method. We call the `group` method to make the calculation for every song, then we filter the search to only songs with the `where` method, and lastly, we sort them and limit the result to the `n` first records
```rb
ratings = Rating
            .select("ratings.votable_id, AVG(ratings.vote) as rating_avg")
            .where(votable_type: "Song")
            .group(:votable_id)
            .order("rating_avg DESC")
            .limit(n)
```

Then, we search the songs with those ratings we found, and we format them to result in the expected result:
```rb
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

### Let's compare the solutions

**Elapsed Time**
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

**Memory**
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

**Iterations per second**
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

**Results of comparison**
* The elapsed time of the third solution is faster than the two first solutions.The first solution is slower than the other two.
* The third solution uses 1.15 times more memory than the second solution, and the first solution uses 557 times more memory than the second solution.
* And on the number of iterations per second, the second solution is 1.42 times slower than the third solution and the first solution 2.79 times slower than the third solution.

In conclusion, the third solution is the best, and the first solution is the least optimal. Why is the solution using pure Active Record the least optimal this time? Because the query we are doing makes joins of two tables, this has an optimization cost, as we can observe.

## Third Problem: Top "N" songs with the highest rating and pass as parameters if you want their artists and albums

### Possible Solutions:
* Build the result by calling different methods based on the parameters.
* Using SQL y Materialized views.

### SQL Views
* They are virtual tables created from a `SELECT` query that usually joins multiple tables. 
* Each time they are called, the query they have been defined will be executed.

### Materialized views
* They are also virtual tables created from a `SELECT` query that normally joins multiple tables.
* They store the query results in this virtual table. They are read-only.
* They can be updated whenever you need them.

### Let's compare the solutions
I'm using the best solution from the previous problem to compare with the SQL and Materialized views.

**Elapsed Time**
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

**Memory**
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

**Iterations per second**
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

**Results of comparison**
* The elapsed time of the second and third solution are faster than the first one.
* The first solution uses 174.21 times more memory than the second and third solutions.
* And on the number of iterations per second, the first solution is 37887.16 times slowerd than the two first solutions.
* In conclusion, the difference between the optimized solution from the previous problem and SQL and Materialized views is considerable.

## Conclusions
* The first problem showed us how to use Active Record to make it more powerful using SQL queries
* The second problem shows us that it is OK to use Ruby to support Active Record.
* The third one shows us that Active Record can also have a limit, and we can use SQL when needed.


**Remember**
* If you will handle a considerable amount of data, try to get only the needed data. You can use the `select` and `pluck` methods from Active Record.
* Sometimes, the Ruby methods are better than the Active Record ones.
* Don't be afraid to use SQL with Active Record.
* Use `size` or `length` instead of `count` if you don't want to make an extra query.
* Avoid `n + 1` queries with `includes` method.

I hope you enjoyed and learned something from this article. Thanks for reading! ❤️
