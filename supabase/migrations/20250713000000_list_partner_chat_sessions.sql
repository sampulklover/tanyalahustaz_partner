-- Efficient session listing for partner chat history API.

create or replace function public.list_partner_chat_sessions(
  p_partner_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_total bigint;
  v_data jsonb;
begin
  select count(*)
  into v_total
  from (
    select 1
    from public.partner_chat_logs
    where partner_id = p_partner_id
    group by session_id
  ) sessions;

  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
  into v_data
  from (
    select
      session_id,
      count(*)::integer as turn_count,
      min(created_at) as created_at,
      max(created_at) as updated_at,
      (array_agg(user_message order by created_at desc))[1] as last_user_message
    from public.partner_chat_logs
    where partner_id = p_partner_id
    group by session_id
    order by max(created_at) desc
    limit v_limit
    offset v_offset
  ) t;

  return jsonb_build_object(
    'data', v_data,
    'total', coalesce(v_total, 0)
  );
end;
$$;

revoke all on function public.list_partner_chat_sessions(uuid, integer, integer) from public;
grant execute on function public.list_partner_chat_sessions(uuid, integer, integer) to service_role;
