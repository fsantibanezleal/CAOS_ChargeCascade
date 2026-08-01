"""Stage 5 - evaluate (the TEST stage, heavy lane): the held-out metrics of the two learned models against the EXACT
analytic engine - the surrogate power error vs Hogg-Fuerstenau/Morrell, and the OOD autoencoder AUC separating
in-envelope from out-of-envelope operating points. Metrics land in cc-learned.json; invoked by pipeline.retrain
(pipeline/science/eval_mill.mjs)."""
