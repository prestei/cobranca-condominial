--
-- PostgreSQL database dump
--

\restrict fSliCl1rk3arpdWFul9cOOOIuOKglKuqPu51bdNFO9DQh6mPp2N0NJXoDkKH46R

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- Name: role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role (
    id integer NOT NULL,
    nome character varying(255) NOT NULL,
    descricao character varying(255) DEFAULT ''::character varying NOT NULL,
    permissao_json text DEFAULT '{}'::text NOT NULL,
    ativo boolean DEFAULT true NOT NULL
);


--
-- Name: role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_id_seq OWNED BY public.role.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    codigo character varying(32) NOT NULL,
    cargo_id integer,
    nome character varying(255),
    cpf character varying(11),
    data_nascimento character varying(8),
    telefone character varying(255),
    email character varying(255),
    senha character varying(255),
    codigo_re character varying(16),
    avatar text,
    ativo boolean DEFAULT true NOT NULL
);


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role ALTER COLUMN id SET DEFAULT nextval('public.role_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role (id, nome, descricao, permissao_json, ativo) FROM stdin;
1	Administrador	Cadastros, relatórios, exportações e correção de registros.	{"dashboard":{"ler":true},"atendimentos":{"ler":true,"criar":true,"editar":true,"excluir":true},"debitos":{"ler":true,"criar":true,"editar":true,"excluir":true},"juridico":{"ler":true,"criar":true,"editar":true},"condominios":{"ler":true,"criar":true,"editar":true,"excluir":true},"unidades":{"ler":true,"criar":true,"editar":true,"excluir":true},"relatorios":{"ler":true,"exportar":true},"importacoes":{"ler":true,"criar":true,"editar":true,"excluir":true},"usuarios":{"ler":true,"criar":true,"editar":true,"excluir":true},"cargos":{"ler":true,"criar":true,"editar":true,"excluir":true},"auditoria":{"ler":true}}	t
2	Atendente	Registra atendimentos e acompanha os próprios retornos.	{"dashboard":{"ler":true},"atendimentos":{"ler":true,"criar":true,"editar":true},"debitos":{"ler":true},"importacoes":{"ler":true,"criar":true,"editar":true}}	t
3	Advogado	Consulta relatórios e o histórico dos condomínios sob sua responsabilidade.	{"dashboard":{"ler":true},"debitos":{"ler":true},"juridico":{"ler":true,"editar":true},"condominios":{"ler":true},"unidades":{"ler":true},"relatorios":{"ler":true,"exportar":true}}	t
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."user" (id, codigo, cargo_id, nome, cpf, data_nascimento, telefone, email, senha, codigo_re, avatar, ativo) FROM stdin;
1	MILENA	1	Milena	\N	\N	71999990001	milena@escritorio.example	$2b$12$i28E0e.k2Ld.FSrys.myW.0bPQ/a9quiTz07iVchW67QFbPQN1gie	RE-10003	\N	t
2	RAQUEL	2	Raquel	\N	\N	71999990002	raquel@escritorio.example	$2b$12$i28E0e.k2Ld.FSrys.myW.0bPQ/a9quiTz07iVchW67QFbPQN1gie	RE-10000	\N	t
3	TASSIA	2	Tássia	\N	\N	71999990003	tassia@escritorio.example	$2b$12$i28E0e.k2Ld.FSrys.myW.0bPQ/a9quiTz07iVchW67QFbPQN1gie	RE-10001	\N	t
4	ATD003	2	Atendente 3	\N	\N	\N	atendente3@escritorio.example	$2b$12$i28E0e.k2Ld.FSrys.myW.0bPQ/a9quiTz07iVchW67QFbPQN1gie	RE-10002	\N	f
5	ADRYELLE	3	Dra. Adryelle	\N	\N	71999990005	adryelle@escritorio.example	$2b$12$i28E0e.k2Ld.FSrys.myW.0bPQ/a9quiTz07iVchW67QFbPQN1gie	RE-10004	\N	t
6	12345	1	Usuário Teste	\N	\N	\N	teste@escritorio.example	$2b$12$i28E0e.k2Ld.FSrys.myW.0bPQ/a9quiTz07iVchW67QFbPQN1gie	RE-10005	\N	t
\.


--
-- Name: role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_id_seq', 3, true);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_id_seq', 6, true);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: role_nome_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_nome_lower_idx ON public.role USING btree (lower((nome)::text));


--
-- Name: role_nome_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX role_nome_unique ON public.role USING btree (lower((nome)::text));


--
-- Name: user_codigo_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_codigo_lower_idx ON public."user" USING btree (lower((codigo)::text));


--
-- Name: user_codigo_re_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_codigo_re_lower_idx ON public."user" USING btree (lower((codigo_re)::text)) WHERE ((codigo_re IS NOT NULL) AND (TRIM(BOTH FROM codigo_re) <> ''::text));


--
-- Name: user_codigo_re_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_codigo_re_unique ON public."user" USING btree (codigo_re) WHERE ((codigo_re IS NOT NULL) AND (TRIM(BOTH FROM codigo_re) <> ''::text));


--
-- Name: user_codigo_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_codigo_unique ON public."user" USING btree (lower(TRIM(BOTH FROM codigo)));


--
-- Name: user_email_lower_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_email_lower_idx ON public."user" USING btree (lower((email)::text)) WHERE ((email IS NOT NULL) AND (TRIM(BOTH FROM email) <> ''::text));


--
-- Name: user user_cargo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_cargo_id_fkey FOREIGN KEY (cargo_id) REFERENCES public.role(id);


--
-- PostgreSQL database dump complete
--

\unrestrict fSliCl1rk3arpdWFul9cOOOIuOKglKuqPu51bdNFO9DQh6mPp2N0NJXoDkKH46R

