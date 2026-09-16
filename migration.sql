-- Migration nécessaire pour la version connectée.
-- À exécuter dans Supabase > SQL Editor.
-- Cette version est fonctionnelle pour un test, mais les données sont lisibles
-- par les utilisateurs anonymes. Pour des données sensibles, il faudra ajouter
-- une authentification organisateur et des fonctions RPC sécurisées.

create policy "Allow anonymous response reading"
on public.responses
for select
to anon
using (true);

create policy "Allow anonymous match insertion"
on public.matches
for insert
to anon
with check (true);

create policy "Allow anonymous match deletion"
on public.matches
for delete
to anon
using (true);
