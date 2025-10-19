-- Create trigger to null agent.preferredModelId when model becomes deprecated
DROP TRIGGER IF EXISTS null_agent_preferred_model_on_deprecation;

CREATE TRIGGER null_agent_preferred_model_on_deprecation
AFTER UPDATE ON model
FOR EACH ROW
    UPDATE agent
    SET preferredModelId = NULL
    WHERE preferredModelId = NEW.id AND NEW.deprecated = TRUE AND OLD.deprecated = FALSE;