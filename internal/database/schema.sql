CREATE TABLE openings (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	eco varchar(8) NOT NULL,
	name text NOT NULL,
	pgn text NOT NULL
);

-- filter openings by categories
select * from openings
where eco like 'A%';


