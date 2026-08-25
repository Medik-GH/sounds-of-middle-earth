export const LotrSpinner = (props: any) => {
    const mapIsLoaded = props.mapIsLoaded;

    if (mapIsLoaded) {
        return null;
    }

    return (
        <div >
            <h1>Loading...</h1>
            <img className='lotr-spinner' src="https://icon-library.com/images/the-one-ring-icon/the-one-ring-icon-27.jpg" />
        </div>
    );
};