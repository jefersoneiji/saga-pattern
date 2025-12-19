--
-- PostgreSQL database dump
--

\restrict oueWhXdhdFL1g7v22WhO2c59R0veTFHLOKdhgEifegezmGdly9IaH1UU1ZAl9wu

-- Dumped from database version 13.22 (Debian 13.22-1.pgdg13+1)
-- Dumped by pg_dump version 13.22 (Debian 13.22-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: sagas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sagas (
    type character varying NOT NULL,
    step_index integer DEFAULT 0 NOT NULL,
    status text NOT NULL,
    data jsonb,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    id text NOT NULL
);


ALTER TABLE public.sagas OWNER TO postgres;

--
-- Name: sagas sagas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sagas
    ADD CONSTRAINT sagas_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict oueWhXdhdFL1g7v22WhO2c59R0veTFHLOKdhgEifegezmGdly9IaH1UU1ZAl9wu

