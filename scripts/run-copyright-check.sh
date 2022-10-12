#!/usr/bin/env bash
# Copyright Kani Contributors
# SPDX-License-Identifier: Apache-2.0 OR MIT

set -o errexit
set -o pipefail
set -o nounset

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
export PATH=$SCRIPT_DIR:$PATH
BASE_DIR=$SCRIPT_DIR/..

# Filter the files for copyright check based on the patterns in `copyright-exclude`
# Exclude rustdoc to reduce conflicts for now:
# https://github.com/model-checking/kani/issues/974
git ls-files $BASE_DIR |\
    grep -v -E -f $SCRIPT_DIR/copyright-exclude |\
    xargs $SCRIPT_DIR/copyright_check.py
