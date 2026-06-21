"""Stage 2 - feature_extraction (heavy lane): assemble the learned-model training data - operating points sampled over
the mill envelope (LHS), each evaluated by the SAME TS engine (cclab/science/gen_train.mjs) to give the
(MILL_FEATURES -> power, regime) labels + the in-envelope vectors for the OOD autoencoder. The feature contract is the
SOURCE OF TRUTH in cclab/model/learned.py."""
