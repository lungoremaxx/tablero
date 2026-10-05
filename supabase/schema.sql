-- Tablero: esquema de Supabase
-- Las tablas no se leen directo desde la app: todo pasa por funciones (RPC)
-- que validan la sesión. El login es nombre + PIN de 4 números.

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------ Tablas

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hue text not null default 'coral',
  pin_hash text not null,
  pin_is_default boolean not null default true,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  position int not null default 0
);

create table if not exists public.sessions (
  token uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hue text not null default 'blue',
  position int not null default 0,
  archived boolean not null default false
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  assignee_id uuid references public.members(id) on delete set null, -- null = Todos
  priority text not null default 'media' check (priority in ('baja','media','alta')),
  due_date date,
  notes text not null default '',
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  done_at timestamptz,
  done_by uuid references public.members(id)
);

create index if not exists tasks_open_idx on public.tasks (done_at, due_date);

-- Sin políticas: la clave pública no puede leer ni escribir las tablas directamente.
alter table public.members enable row level security;
alter table public.sessions enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- ------------------------------------------------------------ Helpers

create or replace function public._session_member(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  select member_id into v from sessions where token = p_token;
  if v is null then raise exception 'SESION_VENCIDA'; end if;
  return v;
end $$;

create or replace function public._task_json(t public.tasks)
returns json language sql immutable as $$
  select json_build_object(
    'id', t.id, 'projectId', t.project_id, 'title', t.title,
    'assigneeId', t.assignee_id, 'priority', t.priority,
    'dueDate', t.due_date, 'notes', t.notes,
    'createdBy', t.created_by, 'createdAt', t.created_at,
    'doneAt', t.done_at, 'doneBy', t.done_by)
$$;

-- ------------------------------------------------------------ Login

create or replace function public.list_members()
returns json language sql security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', id, 'name', name, 'hue', hue) order by position), '[]')
  from members
$$;

create or replace function public.login(p_member uuid, p_pin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare m members; v_token uuid;
begin
  select * into m from members where id = p_member;
  -- Los errores se devuelven (no se lanzan) para que el contador de intentos se guarde
  if m.id is null then return json_build_object('error', 'PIN_INCORRECTO'); end if;
  if m.locked_until is not null and m.locked_until > now() then
    return json_build_object('error', 'BLOQUEADO');
  end if;
  if m.pin_hash <> crypt(p_pin, m.pin_hash) then
    update members set
      failed_attempts = failed_attempts + 1,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '10 minutes' end
    where id = m.id;
    return json_build_object('error', 'PIN_INCORRECTO');
  end if;
  update members set failed_attempts = 0, locked_until = null where id = m.id;
  insert into sessions (member_id) values (m.id) returning token into v_token;
  return json_build_object(
    'token', v_token,
    'memberId', m.id,
    'mustChangePin', m.pin_is_default);
end $$;

create or replace function public.logout(p_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from sessions where token = p_token
$$;

create or replace function public.change_pin(p_token uuid, p_old text, p_new text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v uuid := _session_member(p_token);
begin
  if p_new !~ '^[0-9]{4}$' then raise exception 'PIN_INVALIDO'; end if;
  if not exists (select 1 from members where id = v and pin_hash = crypt(p_old, pin_hash)) then
    raise exception 'PIN_INCORRECTO';
  end if;
  update members set pin_hash = crypt(p_new, gen_salt('bf')), pin_is_default = false where id = v;
end $$;

-- ------------------------------------------------------------ Datos

create or replace function public.load_data(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  perform _session_member(p_token);
  return json_build_object(
    'projects', (select coalesce(json_agg(json_build_object(
        'id', id, 'name', name, 'hue', hue, 'position', position) order by position), '[]')
      from projects where not archived),
    'tasks', (select coalesce(json_agg(_task_json(t)), '[]') from tasks t
      where t.done_at is null or t.done_at > now() - interval '120 days'));
end $$;

create or replace function public.add_task(p_token uuid, p_project uuid, p_title text,
  p_assignee uuid, p_priority text, p_due date, p_notes text)
returns json language plpgsql security definer set search_path = public as $$
declare v uuid := _session_member(p_token); t tasks;
begin
  insert into tasks (project_id, title, assignee_id, priority, due_date, notes, created_by)
  values (p_project, trim(p_title), p_assignee, p_priority, p_due, coalesce(p_notes, ''), v)
  returning * into t;
  return _task_json(t);
end $$;

create or replace function public.update_task(p_token uuid, p_id uuid, p_project uuid, p_title text,
  p_assignee uuid, p_priority text, p_due date, p_notes text)
returns json language plpgsql security definer set search_path = public as $$
declare t tasks;
begin
  perform _session_member(p_token);
  update tasks set project_id = p_project, title = trim(p_title), assignee_id = p_assignee,
    priority = p_priority, due_date = p_due, notes = coalesce(p_notes, '')
  where id = p_id returning * into t;
  if t.id is null then raise exception 'NO_EXISTE'; end if;
  return _task_json(t);
end $$;

create or replace function public.set_done(p_token uuid, p_id uuid, p_done boolean)
returns json language plpgsql security definer set search_path = public as $$
declare v uuid := _session_member(p_token); t tasks;
begin
  update tasks set
    done_at = case when p_done then now() end,
    done_by = case when p_done then v end
  where id = p_id returning * into t;
  if t.id is null then raise exception 'NO_EXISTE'; end if;
  return _task_json(t);
end $$;

create or replace function public.delete_task(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _session_member(p_token);
  delete from tasks where id = p_id;
end $$;

-- Solo estas funciones quedan expuestas a la app
revoke all on function public._session_member(uuid) from public, anon, authenticated;
revoke all on function public._task_json(public.tasks) from public, anon, authenticated;
grant execute on function public.list_members() to anon;
grant execute on function public.login(uuid, text) to anon;
grant execute on function public.logout(uuid) to anon;
grant execute on function public.change_pin(uuid, text, text) to anon;
grant execute on function public.load_data(uuid) to anon;
grant execute on function public.add_task(uuid, uuid, text, uuid, text, date, text) to anon;
grant execute on function public.update_task(uuid, uuid, uuid, text, uuid, text, date, text) to anon;
grant execute on function public.set_done(uuid, uuid, boolean) to anon;
grant execute on function public.delete_task(uuid, uuid) to anon;

-- ------------------------------------------------------------ Datos iniciales
-- PIN inicial 1234: la app pide cambiarlo en el primer ingreso.

insert into public.members (name, hue, pin_hash, position)
select v.name, v.hue, extensions.crypt('1234', extensions.gen_salt('bf')), v.pos
from (values ('Martín', 'coral', 1), ('Felipe', 'blue', 2), ('Ramiro', 'green', 3)) as v(name, hue, pos)
where not exists (select 1 from public.members);

insert into public.projects (name, hue, position)
select v.name, v.hue, v.pos
from (values ('Sótano 22', 'violet', 1), ('Grupo Montalba', 'blue', 2), ('TonoSound', 'teal', 3),
  ('Sushi', 'red', 4), ('Propiedades Nico', 'green', 5), ('La Morocha', 'amber', 6)) as v(name, hue, pos)
where not exists (select 1 from public.projects);

-- ------------------------------------------------------------ Ajustes de seguridad
alter function public._task_json(public.tasks) set search_path = public;
-- La app no usa usuarios de Supabase Auth: solo el rol anónimo llama a las funciones
revoke execute on function public.list_members() from authenticated;
revoke execute on function public.login(uuid, text) from authenticated;
revoke execute on function public.logout(uuid) from authenticated;
revoke execute on function public.change_pin(uuid, text, text) from authenticated;
revoke execute on function public.load_data(uuid) from authenticated;
revoke execute on function public.add_task(uuid, uuid, text, uuid, text, date, text) from authenticated;
revoke execute on function public.update_task(uuid, uuid, uuid, text, uuid, text, date, text) from authenticated;
revoke execute on function public.set_done(uuid, uuid, boolean) from authenticated;
revoke execute on function public.delete_task(uuid, uuid) from authenticated;
