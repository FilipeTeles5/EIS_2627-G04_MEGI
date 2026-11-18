USE movio;

ALTER TABLE payments
    ADD COLUMN checkout_url VARCHAR(2048) NULL AFTER gateway_reference;
