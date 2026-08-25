ALTER TABLE saved_results
    ADD CONSTRAINT ck_saved_similarity_score
    CHECK (similarity_score >= 0.0 AND similarity_score <= 1.0);

CREATE INDEX idx_saved_user_created_at
    ON saved_results (user_id, created_at);
