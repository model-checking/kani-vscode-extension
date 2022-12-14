# Copyright Kani Contributors
# SPDX-License-Identifier: Apache-2.0 OR MIT
if ! command -v kani &> /dev/null
then
    echo "kani could not be found"
    exit
else
    echo "Kani found"
    exit
fi
