if ! command -v kani &> /dev/null
then
    echo "kani could not be found"
    exit
else
    echo "Kani found"
    exit
fi
