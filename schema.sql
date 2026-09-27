-- Skyline flight booking: PostgreSQL schema
-- Changes from your original ER diagram:
--   1. payments table (new), with provider and pending UPI requests
--   2. passengers.seat_id (added, so a traveller can be tied to a seat)
--   3. payments.passenger_id (added, so a payment is billed to a specific traveller)

CREATE TYPE seat_class     AS ENUM ('Economy', 'Business', 'First');
CREATE TYPE booking_status AS ENUM ('Confirmed', 'Cancelled', 'Pending');
CREATE TYPE pay_method     AS ENUM ('UPI', 'Card', 'NetBanking', 'Wallet', 'EMI', 'PayLater');
CREATE TYPE pay_status     AS ENUM ('Success', 'Failed', 'Pending', 'Refunded');

CREATE TABLE users (
  user_id           SERIAL PRIMARY KEY,
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  first_name        VARCHAR(80)  NOT NULL,
  last_name         VARCHAR(80)  NOT NULL,
  phone_number      VARCHAR(30),
  registration_date TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE airports (
  airport_code CHAR(3) PRIMARY KEY,           -- IATA
  airport_name VARCHAR(120) NOT NULL,
  city         VARCHAR(80)  NOT NULL,
  country      VARCHAR(80)  NOT NULL
);

CREATE TABLE flights (
  flight_id              SERIAL PRIMARY KEY,
  flight_number          VARCHAR(10) NOT NULL,
  departure_airport_code CHAR(3) NOT NULL REFERENCES airports(airport_code),
  arrival_airport_code   CHAR(3) NOT NULL REFERENCES airports(airport_code),
  departure_date_time    TIMESTAMPTZ NOT NULL,
  arrival_date_time      TIMESTAMPTZ NOT NULL,
  aircraft_model         VARCHAR(40),
  duration_minutes       INT NOT NULL,
  CHECK (departure_airport_code <> arrival_airport_code),
  CHECK (arrival_date_time > departure_date_time)
);

CREATE TABLE seats (
  seat_id      SERIAL PRIMARY KEY,
  flight_id    INT NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
  seat_number  VARCHAR(4) NOT NULL,           -- e.g. '14A'
  class        seat_class NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  price        NUMERIC(10,2) NOT NULL,
  UNIQUE (flight_id, seat_number)
);

CREATE TABLE bookings (
  booking_id   SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(user_id),
  flight_id    INT NOT NULL REFERENCES flights(flight_id),
  booking_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount NUMERIC(10,2) NOT NULL,
  status       booking_status NOT NULL DEFAULT 'Pending'
);

CREATE TABLE passengers (
  passenger_id    SERIAL PRIMARY KEY,
  booking_id      INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
  seat_id         INT UNIQUE REFERENCES seats(seat_id),   -- ADDED: links a traveller to a seat
  first_name      VARCHAR(80) NOT NULL,
  last_name       VARCHAR(80) NOT NULL,
  date_of_birth   DATE NOT NULL,
  passport_number VARCHAR(20) NOT NULL,
  nationality     VARCHAR(60) NOT NULL
);

CREATE TABLE payments (                        -- NEW
  payment_id      SERIAL PRIMARY KEY,
  booking_id      INT NOT NULL REFERENCES bookings(booking_id),
  passenger_id    INT NOT NULL REFERENCES passengers(passenger_id),  -- ADDED: who the payment is billed to (the lead traveller)
  amount          NUMERIC(10,2) NOT NULL,
  currency        CHAR(3) NOT NULL DEFAULT 'INR',
  method          pay_method NOT NULL,
  provider        VARCHAR(60),                -- 'PhonePe', 'Google Pay', 'Visa', a bank or wallet name
  method_detail   VARCHAR(80),                -- masked: '•••• 4242', a UPI ID, or the last digits of a mobile number
  status          pay_status NOT NULL,
  transaction_ref VARCHAR(40) NOT NULL UNIQUE,
  failure_reason  VARCHAR(200),
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  refunded_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  refunded_at     TIMESTAMPTZ
);

CREATE INDEX idx_flights_route ON flights (departure_airport_code, arrival_airport_code, departure_date_time);
CREATE INDEX idx_seats_flight  ON seats (flight_id) WHERE is_available;
CREATE INDEX idx_bookings_user ON bookings (user_id, booking_date DESC);
CREATE INDEX idx_payments_booking ON payments (booking_id);
CREATE INDEX idx_payments_passenger ON payments (passenger_id);
