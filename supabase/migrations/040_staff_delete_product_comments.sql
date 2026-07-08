-- Admin e moderadores podem excluir comentários de produtos (moderação).

DROP POLICY IF EXISTS "Users can delete own product comments" ON public.product_comments;
CREATE POLICY "Users can delete own product comments" ON public.product_comments
  FOR DELETE USING (auth.uid() = user_id OR public.is_staff());