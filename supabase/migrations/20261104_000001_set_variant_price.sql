-- ============================================================
-- BizFlow ZW: atomic active price replacement for product variants
-- File: supabase/migrations/20261104_000001_set_variant_price.sql
--
-- Install notes:
--   - This migration assumes the live database has already been inspected and
--     confirmed to match the conditions in the project review:
--       * product_prices.business_id, product_variant_id, currency, selling_price_per_crate are NOT NULL
--       * product_variants.id and business_id are NOT NULL
--       * business_members.business_id, user_id, role, is_active are NOT NULL
--       * RLS is enabled and privileges are available to authenticated members
--       * No duplicate active prices exist
--       * The target index name does not already exist
-- ============================================================

BEGIN;

-- ============================================================
-- PRE-FLIGHT CHECK: duplicate active prices
-- ============================================================
-- If this query returns any rows, stop and review the data before creating the
-- unique partial index. Do not auto-delete or rewrite historical price rows.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.product_prices
    WHERE is_active = true
    GROUP BY business_id, product_variant_id, currency
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate active price records detected for a business, variant and currency. Manual review required before index creation.';
  END IF;
END $$;

-- ============================================================
-- INTEGRITY GUARANTEE: at most one active price per business/variant/currency
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS product_prices_one_active_per_variant_currency_idx
ON public.product_prices (business_id, product_variant_id, currency)
WHERE is_active = true;

-- ============================================================
-- FUNCTION: public.set_variant_price
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_variant_price(
  p_business_id uuid,
  p_product_variant_id uuid,
  p_selling_price_per_crate numeric
)
RETURNS public.product_prices
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_variant record;
  v_existing public.product_prices;
  v_new_record public.product_prices;
BEGIN
  -- 1) Require an authenticated user.
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required for price updates'
      USING HINT = 'The caller must be authenticated.';
  END IF;

  -- 2) Required identifiers.
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'business_id is required';
  END IF;

  IF p_product_variant_id IS NULL THEN
    RAISE EXCEPTION 'product_variant_id is required';
  END IF;

  -- 3) Validate price value.
  IF p_selling_price_per_crate IS NULL THEN
    RAISE EXCEPTION 'Price is required';
  END IF;

  -- PostgreSQL numeric special values must be rejected explicitly.
  -- This rejects NaN and infinities using numeric text output.
  IF lower(trim(p_selling_price_per_crate::text)) IN ('nan', 'infinity', '-infinity') THEN
    RAISE EXCEPTION 'Price must be a finite, positive numeric value';
  END IF;

  IF p_selling_price_per_crate <= 0 THEN
    RAISE EXCEPTION 'Price must be greater than zero';
  END IF;

  -- 4) Validate active membership in the supplied business.
  IF NOT EXISTS (
    SELECT 1
    FROM public.business_members AS bm
    WHERE bm.business_id = p_business_id
      AND bm.user_id = v_user_id
      AND bm.is_active = true
  ) THEN
    RAISE EXCEPTION 'User is not an active member of the specified business'
      USING HINT = 'Only active business members may update prices.';
  END IF;

  -- 5) Lock the parent product variant row before reading/changing active prices.
  -- This serializes concurrent updates even when no active price exists yet.
  SELECT pv.*
  INTO v_variant
  FROM public.product_variants AS pv
  WHERE pv.id = p_product_variant_id
    AND pv.business_id = p_business_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variant does not belong to the supplied business'
      USING HINT = 'Verify the target business_id and product_variant_id.';
  END IF;

  -- 6) Lock the current active USD price row for this business and variant, if present.
  SELECT pp.*
  INTO v_existing
  FROM public.product_prices AS pp
  WHERE pp.business_id = p_business_id
    AND pp.product_variant_id = p_product_variant_id
    AND pp.currency = 'USD'
    AND pp.is_active = true
  FOR UPDATE;

  -- 7) Deactivate the previous active USD price without deleting historical rows.
  IF FOUND THEN
    UPDATE public.product_prices AS pp
    SET is_active = false,
        updated_at = now()
    WHERE pp.id = v_existing.id;
  END IF;

  -- 8) Insert the replacement active USD price and return it.
  INSERT INTO public.product_prices (
    business_id,
    product_variant_id,
    currency,
    selling_price_per_crate,
    effective_from,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    p_business_id,
    p_product_variant_id,
    'USD',
    p_selling_price_per_crate,
    now(),
    true,
    now(),
    now()
  )
  RETURNING *
  INTO v_new_record;

  RETURN v_new_record;
END;
$$;

REVOKE ALL ON FUNCTION public.set_variant_price(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_variant_price(uuid, uuid, numeric) TO authenticated;

COMMIT;
